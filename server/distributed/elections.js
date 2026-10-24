import axios from "axios";
import ftPool from "../config/ftDb.js";
import {
  NODE_ID,
  CLUSTER_PEERS,
  getCoordinator,
  setCoordinator
} from "./nodeRegistry.js";

/**
 * BULLY ELECTION ALGORITHM
 * 
 * Rules:
 * 1. A node (e.g. detecting coordinator failure) initiates an election.
 * 2. It sends ELECTION messages to all nodes with a HIGHER node ID.
 * 3. If no higher nodes respond (or if this is already the highest active node),
 *    this node wins the election and sends COORDINATOR announcement to all lower nodes.
 * 4. If any higher node responds with OK, that higher node takes over the election.
 */
export async function runBullyElection(initiatorId = NODE_ID) {
  console.log(`[Bully] Election started by Node ${initiatorId}`);
  const electionMessages = [];
  const activeNodes = [];
  const failedNodes = [];

  // Active server peers participating in leader election (Nodes 1, 2, 3)
  const appServers = CLUSTER_PEERS.filter(p => p.role === "SERVER" && p.nodeId <= 3);

  // Probe all nodes to discover who is reachable
  for (const peer of appServers) {
    if (peer.nodeId === NODE_ID) {
      activeNodes.push(NODE_ID);
    } else {
      try {
        const res = await axios.get(`${peer.url}/api/distributed/health`, { timeout: 1200 });
        if (res.data && res.data.status !== "OFFLINE") {
          activeNodes.push(peer.nodeId);
        } else {
          failedNodes.push(peer.nodeId);
        }
      } catch (err) {
        failedNodes.push(peer.nodeId);
      }
    }
  }

  // Higher candidate nodes
  const higherNodes = appServers.filter(p => p.nodeId > initiatorId && activeNodes.includes(p.nodeId));
  const unreachableHigherNodes = appServers.filter(p => p.nodeId > initiatorId && !activeNodes.includes(p.nodeId));

  electionMessages.push({
    from: initiatorId,
    type: "INITIATE",
    detail: `Node ${initiatorId} started Bully Election after detecting missing/unhealthy coordinator.`
  });

  for (const un of unreachableHigherNodes) {
    electionMessages.push({
      from: initiatorId,
      to: un.nodeId,
      type: "ELECTION_PROBE",
      detail: `Sent ELECTION to higher Node ${un.nodeId} -> TIMEOUT / NO ANSWER (Node is down).`
    });
  }

  let electedCoordinator = initiatorId;

  if (higherNodes.length > 0) {
    // Higher nodes responded: the highest responsive one wins
    for (const hn of higherNodes) {
      electionMessages.push({
        from: initiatorId,
        to: hn.nodeId,
        type: "ELECTION",
        detail: `Sent ELECTION to Node ${hn.nodeId} -> Responded with 'OK (I will take over)'.`
      });
    }
    // Pick the maximum active node ID
    electedCoordinator = Math.max(...activeNodes);
    electionMessages.push({
      from: electedCoordinator,
      type: "VICTORY",
      detail: `Node ${electedCoordinator} has the highest ID among all active nodes.`
    });
  } else {
    // No higher nodes responded -> Initiator becomes coordinator
    electionMessages.push({
      from: initiatorId,
      type: "VICTORY",
      detail: `No active nodes with higher ID than Node ${initiatorId}. Node ${initiatorId} wins election!`
    });
    electedCoordinator = initiatorId;
  }

  setCoordinator(electedCoordinator);
  const controllerUrl = process.env.CONTROLLER_URL || "http://controller:5000";
  axios.post(`${controllerUrl}/api/distributed/coordinator-update`, { coordinatorId: electedCoordinator }, { timeout: 1200 }).catch(() => {});

  // Broadcast victory / COORDINATOR announcement to all peers
  for (const peer of appServers) {
    electionMessages.push({
      from: electedCoordinator,
      to: peer.nodeId,
      type: "COORDINATOR",
      detail: `Announced COORDINATOR: Node ${electedCoordinator} to Node ${peer.nodeId}.`
    });

    if (peer.nodeId === NODE_ID) {
      setCoordinator(electedCoordinator);
    } else if (activeNodes.includes(peer.nodeId)) {
      axios.post(`${peer.url}/api/distributed/coordinator-update`, { coordinatorId: electedCoordinator }, { timeout: 1200 })
        .catch(() => {});
    }
  }

  // Log to FT Database
  ftPool.promise().query(
    `INSERT INTO \`election_log\` (algorithm, initiator_node_id, elected_coordinator_id, messages_flow, participating_nodes)
     VALUES (?, ?, ?, ?, ?)`,
    ["BULLY", initiatorId, electedCoordinator, JSON.stringify(electionMessages), JSON.stringify(activeNodes)]
  ).catch(() => {});

  return {
    algorithm: "BULLY",
    initiatingNode: initiatorId,
    activeNodes,
    failedNodes,
    electionMessages,
    electedCoordinator,
    timestamp: new Date().toISOString()
  };
}

/**
 * RING ELECTION ALGORITHM
 * 
 * Rules:
 * 1. Nodes form an ordered logical ring: 1 -> 2 -> 3 -> 1.
 * 2. An initiator creates an ELECTION token: [initiatorId].
 * 3. It passes the message to its successor in the ring. If the successor is down, it skips to the next.
 * 4. Each node appends its own ID to the active list and forwards the token.
 * 5. When the token returns to the initiator, the node with the highest ID is elected.
 * 6. A COORDINATOR message containing the winner is circulated around the ring.
 */
export async function runRingElection(initiatorId = NODE_ID) {
  console.log(`[Ring] Election started by Node ${initiatorId}`);
  const electionMessages = [];
  const activeNodes = [];
  const failedNodes = [];

  const ringOrder = [1, 2, 3];
  const appServers = CLUSTER_PEERS.filter(p => p.role === "SERVER" && p.nodeId <= 3);

  // Probe nodes
  for (const id of ringOrder) {
    const peer = appServers.find(p => p.nodeId === id);
    if (!peer) continue;
    if (id === NODE_ID) {
      activeNodes.push(id);
    } else {
      try {
        const res = await axios.get(`${peer.url}/api/distributed/health`, { timeout: 1200 });
        if (res.data && res.data.status !== "OFFLINE") {
          activeNodes.push(id);
        } else {
          failedNodes.push(id);
        }
      } catch (e) {
        failedNodes.push(id);
      }
    }
  }

  electionMessages.push({
    from: initiatorId,
    type: "RING_INITIATE",
    token: [initiatorId],
    detail: `Node ${initiatorId} initiated Ring Election. Initial token: [${initiatorId}]. Ring Topology: 1 -> 2 -> 3 -> 1.`
  });

  // Circulate token through active ring members
  const token = [initiatorId];
  const startIndex = ringOrder.indexOf(initiatorId);

  for (let step = 1; step < ringOrder.length; step++) {
    const nextNodeId = ringOrder[(startIndex + step) % ringOrder.length];
    if (activeNodes.includes(nextNodeId)) {
      token.push(nextNodeId);
      electionMessages.push({
        from: ringOrder[(startIndex + step - 1 + ringOrder.length) % ringOrder.length],
        to: nextNodeId,
        type: "TOKEN_FORWARD",
        token: [...token],
        detail: `Token forwarded to Node ${nextNodeId}. Accumulated active list: [${token.join(", ")}].`
      });
    } else {
      electionMessages.push({
        to: nextNodeId,
        type: "NODE_SKIPPED",
        token: [...token],
        detail: `Node ${nextNodeId} is OFFLINE / unreachable. Skipped in logical ring.`
      });
    }
  }

  // Token returns to initiator
  const electedCoordinator = Math.max(...token);
  electionMessages.push({
    from: initiatorId,
    type: "RING_COMPLETE",
    token: [...token],
    detail: `Token returned to initiator Node ${initiatorId}. Winner is MAX([${token.join(", ")}]) = Node ${electedCoordinator}.`
  });

  setCoordinator(electedCoordinator);
  const controllerUrlRing = process.env.CONTROLLER_URL || "http://controller:5000";
  axios.post(`${controllerUrlRing}/api/distributed/coordinator-update`, { coordinatorId: electedCoordinator }, { timeout: 1200 }).catch(() => {});

  // Circulate Coordinator Announcement around ring
  for (const id of activeNodes) {
    electionMessages.push({
      from: electedCoordinator,
      to: id,
      type: "COORDINATOR_ANNOUNCE",
      detail: `Circulated COORDINATOR announcement: Node ${electedCoordinator} is elected coordinator.`
    });

    if (id === NODE_ID) {
      setCoordinator(electedCoordinator);
    } else {
      const peer = appServers.find(p => p.nodeId === id);
      if (peer) {
        axios.post(`${peer.url}/api/distributed/coordinator-update`, { coordinatorId: electedCoordinator }, { timeout: 1200 })
          .catch(() => {});
      }
    }
  }

  // Log to FT Database
  ftPool.promise().query(
    `INSERT INTO \`election_log\` (algorithm, initiator_node_id, elected_coordinator_id, messages_flow, participating_nodes)
     VALUES (?, ?, ?, ?, ?)`,
    ["RING", initiatorId, electedCoordinator, JSON.stringify(electionMessages), JSON.stringify(activeNodes)]
  ).catch(() => {});

  return {
    algorithm: "RING",
    initiatingNode: initiatorId,
    ringOrder: ringOrder.filter(id => activeNodes.includes(id)),
    activeNodes,
    failedNodes,
    tokenFlow: token,
    electionMessages,
    electedCoordinator,
    timestamp: new Date().toISOString()
  };
}
