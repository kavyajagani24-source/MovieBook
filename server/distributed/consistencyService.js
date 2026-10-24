import axios from "axios";
import os from "os";
import db from "../config/db.js";
import ftPool from "../config/ftDb.js";
import { NODE_ID, CLUSTER_PEERS } from "./nodeRegistry.js";

const REPLICA_DELAY_MS = 2000;

async function ensureTables() {
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS consistency_ledger (
      record_key VARCHAR(128) PRIMARY KEY,
      record_value TEXT NOT NULL,
      version INT NOT NULL,
      written_by_node INT NOT NULL,
      write_mode VARCHAR(32) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS consistency_replica (
      record_key VARCHAR(128) PRIMARY KEY,
      record_value TEXT NOT NULL,
      version INT NOT NULL,
      written_by_node INT NOT NULL,
      replicated_by_node INT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function writePrimary({ key, value, version, mode }) {
  await db.promise().query(
    `INSERT INTO consistency_ledger (record_key, record_value, version, written_by_node, write_mode)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (record_key) DO UPDATE SET
       record_value = EXCLUDED.record_value,
       version = EXCLUDED.version,
       written_by_node = EXCLUDED.written_by_node,
       write_mode = EXCLUDED.write_mode`,
    [key, value, version, NODE_ID, mode]
  );
}

export async function writeReplica({ key, value, version, writtenByNode }) {
  await ensureTables();
  await ftPool.promise().query(
    `INSERT INTO consistency_replica
       (record_key, record_value, version, written_by_node, replicated_by_node)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (record_key) DO UPDATE SET
       record_value = EXCLUDED.record_value,
       version = EXCLUDED.version,
       written_by_node = EXCLUDED.written_by_node,
       replicated_by_node = EXCLUDED.replicated_by_node`,
    [key, value, version, writtenByNode, NODE_ID]
  );
  return { success: true, key, version, replicatedBy: NODE_ID };
}

async function pushReplicaToBackup({ key, value, version }) {
  if (NODE_ID === 4) {
    return writeReplica({ key, value, version, writtenByNode: NODE_ID });
  }
  const backup = CLUSTER_PEERS.find((peer) => peer.nodeId === 4);
  if (!backup) throw new Error("Backup container is not in the topology.");
  const resp = await axios.post(
    `${backup.url}/api/distributed/consistency/replicate`,
    { key, value, version, writtenByNode: NODE_ID },
    { timeout: 2500 }
  );
  return resp.data;
}

/**
 * This container's view of a key.
 * Application containers read the primary ledger.
 * The backup container reads the fault-tolerance replica.
 */
export async function readLocalConsistency(key) {
  await ensureTables();
  const source = NODE_ID === 4 ? "replica" : "primary";
  const pool = NODE_ID === 4 ? ftPool : db;
  const table = NODE_ID === 4 ? "consistency_replica" : "consistency_ledger";
  const [rows] = await pool.promise().query(
    `SELECT record_key, record_value, version, written_by_node, updated_at FROM \`${table}\` WHERE record_key = ?`,
    [key]
  );
  const row = rows[0] || null;
  return {
    nodeId: NODE_ID,
    hostname: os.hostname(),
    source,
    key,
    version: row ? Number(row.version) : null,
    value: row ? row.record_value : null,
    writtenByNode: row ? row.written_by_node : null,
    updatedAt: row ? row.updated_at : null
  };
}

async function collectContainerViews(key) {
  const views = [];
  for (const peer of CLUSTER_PEERS) {
    if (peer.nodeId === NODE_ID) {
      views.push(await readLocalConsistency(key));
      continue;
    }
    try {
      const resp = await axios.get(`${peer.url}/api/distributed/consistency/read`, {
        params: { key },
        timeout: 1500
      });
      views.push(resp.data);
    } catch (err) {
      views.push({
        nodeId: peer.nodeId,
        hostname: null,
        source: peer.nodeId === 4 ? "replica" : "primary",
        key,
        version: null,
        value: null,
        reachable: false,
        error: err.message
      });
    }
  }
  return views;
}

function summarize(version, views) {
  const reachable = views.filter((view) => view.reachable !== false && view.version !== undefined);
  const matching = reachable.filter((view) => view.version === version);
  const replica = views.find((view) => view.nodeId === 4);
  const replicaMatches = replica?.version === version;
  return {
    expectedVersion: version,
    containersReached: reachable.length,
    containersMatching: matching.length,
    replicaVersion: replica?.version ?? null,
    replicaMatches,
    consistent: replicaMatches && matching.length === reachable.length && reachable.length > 0
  };
}

export async function runConsistencyWrite({ key, value, mode }) {
  if (!key) throw new Error("A record key is required.");
  const writeMode = mode === "eventual" ? "eventual" : "strong";
  await ensureTables();

  const [existing] = await db.promise().query(
    "SELECT version FROM `consistency_ledger` WHERE record_key = ?",
    [key]
  );
  const version = (existing[0]?.version || 0) + 1;
  await writePrimary({ key, value: String(value ?? ""), version, mode: writeMode });

  if (writeMode === "strong") {
    await pushReplicaToBackup({ key, value: String(value ?? ""), version });
    const views = await collectContainerViews(key);
    const summary = summarize(version, views);
    return {
      mode: "strong",
      key,
      version,
      value: String(value ?? ""),
      writtenByNode: NODE_ID,
      replication: "ACKED",
      quorum: "primary + backup",
      ...summary,
      views
    };
  }

  setTimeout(() => {
    pushReplicaToBackup({ key, value: String(value ?? ""), version }).catch((err) => {
      console.warn(`[Consistency] Delayed replica for '${key}' failed: ${err.message}`);
    });
  }, REPLICA_DELAY_MS);

  const views = await collectContainerViews(key);
  const summary = summarize(version, views);
  return {
    mode: "eventual",
    key,
    version,
    value: String(value ?? ""),
    writtenByNode: NODE_ID,
    replication: "PENDING",
    replicaDelayMs: REPLICA_DELAY_MS,
    quorum: "primary acknowledged, backup catches up",
    ...summary,
    views
  };
}

export async function compareConsistency(key) {
  if (!key) throw new Error("A record key is required.");
  await ensureTables();
  const [rows] = await db.promise().query(
    "SELECT version, record_value FROM `consistency_ledger` WHERE record_key = ?",
    [key]
  );
  if (!rows.length) {
    return { key, found: false, consistent: false, views: await collectContainerViews(key) };
  }
  const version = Number(rows[0].version);
  const views = await collectContainerViews(key);
  return {
    key,
    found: true,
    value: rows[0].record_value,
    ...summarize(version, views),
    views
  };
}
