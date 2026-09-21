import express from "express";
import axios from "axios";
import db from "../config/db.js";
import {
  NODE_ID,
  NODE_ROLE,
  PORT,
  CLUSTER_PEERS,
  getLocalNodeInfo,
  getLocalClock,
  setLocalClockOffset,
  setSimulatedOffline,
  getSimulatedOffline,
  getCoordinator,
  setCoordinator,
  setBackupPromoted,
  getIsBackupPromoted
} from "../distributed/nodeRegistry.js";
import { executeRpcMethod } from "../distributed/rpcHandler.js";
import { getRecentRequestLogs, logDistributedRequest } from "../distributed/requestLogger.js";
import { runConcurrentBookingTest } from "../distributed/concurrencyManager.js";
import { runBerkeleySynchronization } from "../distributed/berkeleyClock.js";
import { runBullyElection, runRingElection } from "../distributed/elections.js";
import {
  replicateBookingToBackup,
  saveToFaultToleranceDb,
  getReplicationStatus
} from "../distributed/replicationService.js";

const router = express.Router();

// -------------------------------------------------------------
// 1. Cluster Topology & Node Status
// -------------------------------------------------------------

// GET /api/distributed/nodes - Live health status of all 4 cluster nodes
router.get("/nodes", async (req, res) => {
  const nodes = [];

  for (const peer of CLUSTER_PEERS) {
    if (peer.nodeId === NODE_ID) {
      nodes.push({
        ...getLocalNodeInfo(),
        url: peer.url
      });
    } else {
      try {
        const resp = await axios.get(`${peer.url}/api/distributed/health`, { timeout: 1000 });
        nodes.push({
          ...resp.data,
          url: peer.url
        });
      } catch (err) {
        nodes.push({
          nodeId: peer.nodeId,
          role: peer.role,
          port: peer.port,
          url: peer.url,
          status: "OFFLINE",
          currentClock: "-",
          clockTime: "-",
          clockOffsetMs: 0,
          currentCoordinator: "-",
          isPrimary: false,
          lastHeartbeat: "-",
          error: "Unreachable"
        });
      }
    }
  }

  res.json({
    currentNodeId: NODE_ID,
    clusterSize: CLUSTER_PEERS.length,
    nodes
  });
});

// GET /api/distributed/health - Real health check probe with distributed time
router.get("/health", (req, res) => {
  if (getSimulatedOffline()) {
    return res.status(503).json({
      nodeId: NODE_ID,
      role: NODE_ROLE,
      port: PORT,
      status: "OFFLINE",
      message: "Node is simulating hardware/network failure"
    });
  }
  res.json(getLocalNodeInfo());
});

// GET /api/distributed/status - Overview of primary, coordinator, and active role
router.get("/status", (req, res) => {
  res.json({
    nodeId: NODE_ID,
    role: (NODE_ID === 4 && getIsBackupPromoted()) ? "PRIMARY" : NODE_ROLE,
    port: PORT,
    status: getSimulatedOffline() ? "OFFLINE" : "ONLINE",
    currentCoordinator: getCoordinator(),
    isPrimary: (NODE_ID === 4 && getIsBackupPromoted()) ? true : (NODE_ID === 1 || NODE_ID === 2),
    isBackupPromoted: getIsBackupPromoted(),
    clock: getLocalClock()
  });
});

// -------------------------------------------------------------
// 2. Client-Server / RPC Layer
// -------------------------------------------------------------

// POST /api/distributed/rpc - Execute remote method invocation
router.post("/rpc", async (req, res) => {
  if (getSimulatedOffline()) {
    return res.status(503).json({ error: `Server ${NODE_ID} is simulated OFFLINE.` });
  }

  const { method, params } = req.body;
  if (!method) return res.status(400).json({ error: "Missing RPC 'method'" });

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const outcome = await executeRpcMethod(method, params || {}, clientIp);

  if (!outcome.success) {
    return res.status(400).json(outcome);
  }
  res.json(outcome);
});

// GET /api/distributed/rpc/logs - Audit logs of RPC and HTTP requests
router.get("/rpc/logs", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 30;
  res.json(getRecentRequestLogs(limit));
});

// -------------------------------------------------------------
// 3. Multithreading / Concurrent Booking Experiment
// -------------------------------------------------------------

// POST /api/distributed/concurrency-test - Launch concurrent booking attempts
router.post("/concurrency-test", async (req, res) => {
  if (getSimulatedOffline()) {
    return res.status(503).json({ error: `Server ${NODE_ID} is simulated OFFLINE.` });
  }

  const { showId = 1, seat = "A5", requestCount = 10, customerId = 1 } = req.body;
  try {
    const result = await runConcurrentBookingTest({
      showId: Number(showId),
      seat: String(seat),
      requestCount: Math.min(Number(requestCount), 25), // safe cap
      customerId: Number(customerId)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Berkeley Clock Synchronization
// -------------------------------------------------------------

// GET /api/distributed/clocks - View distributed clocks of all nodes
router.get("/clocks", async (req, res) => {
  const clocks = [];
  for (const peer of CLUSTER_PEERS) {
    if (peer.nodeId === NODE_ID) {
      clocks.push({
        nodeId: NODE_ID,
        role: NODE_ROLE,
        ...getLocalClock(),
        status: getSimulatedOffline() ? "OFFLINE" : "ONLINE"
      });
    } else {
      try {
        const resp = await axios.get(`${peer.url}/api/distributed/clock-probe`, { timeout: 1000 });
        clocks.push(resp.data);
      } catch (e) {
        clocks.push({
          nodeId: peer.nodeId,
          role: peer.role,
          status: "OFFLINE",
          distributedTimestamp: 0,
          timeString: "-",
          offsetMs: 0
        });
      }
    }
  }
  res.json({
    coordinatorId: getCoordinator(),
    clocks
  });
});

// GET /api/distributed/clock-probe - Internal peer probe for Berkeley algorithm
router.get("/clock-probe", (req, res) => {
  if (getSimulatedOffline()) {
    return res.json({ nodeId: NODE_ID, status: "OFFLINE" });
  }
  res.json({
    nodeId: NODE_ID,
    role: NODE_ROLE,
    status: "ONLINE",
    ...getLocalClock()
  });
});

// POST /api/distributed/clock-adjust - Apply Berkeley calculated adjustment
router.post("/clock-adjust", (req, res) => {
  const { adjustmentMs, newOffsetMs } = req.body;
  setLocalClockOffset(newOffsetMs);
  console.log(`[Berkeley] Applied clock adjustment: ${adjustmentMs}ms. New offset: ${newOffsetMs}ms`);
  res.json({
    nodeId: NODE_ID,
    applied: true,
    newClock: getLocalClock()
  });
});

// POST /api/distributed/berkeley/sync - Trigger Berkeley algorithm from coordinator
router.post("/berkeley/sync", async (req, res) => {
  try {
    const result = await runBerkeleySynchronization(NODE_ID);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. Leader Election (Bully & Ring)
// -------------------------------------------------------------

// POST /api/distributed/election/bully - Run Bully Election
router.post("/election/bully", async (req, res) => {
  try {
    const result = await runBullyElection(NODE_ID);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/distributed/election/ring - Run Ring Election
router.post("/election/ring", async (req, res) => {
  try {
    const result = await runRingElection(NODE_ID);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/distributed/coordinator-update - Update local coordinator reference
router.post("/coordinator-update", (req, res) => {
  const { coordinatorId } = req.body;
  setCoordinator(coordinatorId);
  console.log(`[Election] Updated coordinator to Node ${coordinatorId}`);
  res.json({ success: true, coordinatorId });
});

// -------------------------------------------------------------
// 6. Fault Tolerance & Primary-Backup Replication
// -------------------------------------------------------------

// POST /api/distributed/replication/receive - Backup server receives replica
router.post("/replication/receive", async (req, res) => {
  const { bookingId, customerId, showId, ticketNo, seatData, totalPrice, sourceNodeId } = req.body;
  console.log(`[Backup Node ${NODE_ID}] Received replication for Booking #${bookingId} from Node ${sourceNodeId}`);

  const saveRes = await saveToFaultToleranceDb({
    bookingId,
    customerId,
    showId,
    ticketNo,
    seatData,
    totalPrice,
    sourceNodeId
  });

  if (saveRes.success) {
    res.status(201).json(saveRes);
  } else {
    res.status(500).json(saveRes);
  }
});

// GET /api/distributed/replication/status - Get FT DB state and counts
router.get("/replication/status", async (req, res) => {
  const status = await getReplicationStatus();
  res.json(status);
});

// POST /api/distributed/simulate-failure - Toggle simulated hardware/network crash for any node
router.post("/simulate-failure", async (req, res) => {
  const { nodeId, offline } = req.body;
  const targetId = nodeId ? Number(nodeId) : NODE_ID;

  if (targetId === NODE_ID) {
    const isOffline = offline !== undefined ? Boolean(offline) : !getSimulatedOffline();
    setSimulatedOffline(isOffline);
    console.log(`[Failover] Node ${NODE_ID} simulated state set to: ${isOffline ? "OFFLINE" : "ONLINE"}`);
    return res.json({
      nodeId: NODE_ID,
      simulatedOffline: isOffline,
      status: isOffline ? "OFFLINE" : "ONLINE"
    });
  }

  // Forward failure toggle to target peer node
  const peer = CLUSTER_PEERS.find(p => p.nodeId === targetId);
  if (!peer) return res.status(404).json({ error: `Node ${targetId} not found in topology.` });

  try {
    const resp = await axios.post(`${peer.url}/api/distributed/simulate-failure`, { offline }, { timeout: 1500 });
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: `Failed to contact Node ${targetId}: ${err.message}` });
  }
});

// POST /api/distributed/promote-backup - Promote Backup (Node 4) to PRIMARY
router.post("/promote-backup", async (req, res) => {
  const { nodeId } = req.body;
  const targetId = nodeId ? Number(nodeId) : NODE_ID;

  if (targetId === NODE_ID) {
    setBackupPromoted(true);
    console.log(`[Failover] Node ${NODE_ID} PROMOTED to PRIMARY!`);
    return res.json({
      nodeId: NODE_ID,
      role: "PRIMARY",
      isPromoted: true,
      message: "Backup Server successfully promoted to Primary Application Server"
    });
  }

  // Forward promotion to target peer node (e.g., tell Node 4 to promote itself)
  const peer = CLUSTER_PEERS.find(p => p.nodeId === targetId);
  if (!peer) return res.status(404).json({ error: `Node ${targetId} not found in topology.` });

  try {
    const resp = await axios.post(`${peer.url}/api/distributed/promote-backup`, {}, { timeout: 1500 });
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: `Failed to contact Node ${targetId}: ${err.message}` });
  }
});

export default router;
