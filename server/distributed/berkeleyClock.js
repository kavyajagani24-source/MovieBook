import axios from "axios";
import ftPool from "../config/ftDb.js";
import {
  NODE_ID,
  CLUSTER_PEERS,
  getLocalClock,
  setLocalClockOffset,
  getCoordinator
} from "./nodeRegistry.js";

/**
 * Berkeley Clock Synchronization Algorithm.
 * 
 * 1. The Coordinator queries all active participating application servers (Node 1, 2, 3) for their clocks.
 * 2. It collects local distributed timestamps from all reachable nodes.
 * 3. It calculates the time difference of each node relative to the coordinator.
 * 4. It computes the average difference across all healthy responding nodes.
 * 5. It sends each node its required clock adjustment delta:
 *      adjustment_i = average_diff - relative_diff_i
 * 6. Each node adds the adjustment to its local clock offset.
 */
export async function runBerkeleySynchronization() {
  const coordinatorId = getCoordinator();
  console.log(`[Berkeley] Clock sync uses coordinator node ${coordinatorId}`);

  // Only active application servers participate in clock synchronization (Nodes 1, 2, 3)
  const participatingServers = CLUSTER_PEERS.filter(p => p.role === "SERVER" && p.nodeId <= 3);

  const collectedClocks = [];
  const unreachableNodes = [];

  // 1. Gather timestamps from all active nodes
  for (const peer of participatingServers) {
    if (peer.nodeId === NODE_ID) {
      // Local node clock
      const local = getLocalClock();
      collectedClocks.push({
        nodeId: NODE_ID,
        url: peer.url,
        timestamp: local.distributedTimestamp,
        offsetMs: local.offsetMs,
        isoString: local.isoString,
        timeString: local.timeString
      });
    } else {
      try {
        const resp = await axios.get(`${peer.url}/api/distributed/clock-probe`, { timeout: 1500 });
        if (resp.data && resp.data.status !== "OFFLINE") {
          collectedClocks.push({
            nodeId: peer.nodeId,
            url: peer.url,
            timestamp: resp.data.distributedTimestamp,
            offsetMs: resp.data.offsetMs,
            isoString: resp.data.isoString,
            timeString: resp.data.timeString
          });
        } else {
          unreachableNodes.push(peer.nodeId);
        }
      } catch (err) {
        unreachableNodes.push(peer.nodeId);
      }
    }
  }

  if (collectedClocks.length === 0) {
    throw new Error("No active nodes reachable for Berkeley synchronization.");
  }

  // 2. Choose coordinator's timestamp as reference
  const coordEntry = collectedClocks.find(c => c.nodeId === coordinatorId) || collectedClocks[0];
  const refTime = coordEntry.timestamp;

  // 3. Compute relative differences (diff_i = time_i - refTime)
  const relativeDiffs = collectedClocks.map(c => ({
    nodeId: c.nodeId,
    diff: c.timestamp - refTime
  }));

  // 4. Calculate average difference across all healthy nodes
  const totalDiff = relativeDiffs.reduce((acc, curr) => acc + curr.diff, 0);
  const avgDiff = Math.round(totalDiff / relativeDiffs.length);

  // 5. Calculate adjustments for each node (adjustment = avgDiff - diff_i)
  const adjustments = collectedClocks.map(c => {
    const nodeDiff = c.timestamp - refTime;
    const adjustment = avgDiff - nodeDiff;
    const newOffset = c.offsetMs + adjustment;
    return {
      nodeId: c.nodeId,
      url: c.url,
      currentOffsetMs: c.offsetMs,
      adjustmentMs: adjustment,
      newOffsetMs: newOffset,
      originalTime: c.timeString
    };
  });

  // 6. Broadcast adjustments to all participating nodes
  const broadcastResults = [];
  for (const adj of adjustments) {
    if (adj.nodeId === NODE_ID) {
      setLocalClockOffset(adj.newOffsetMs);
      broadcastResults.push({ nodeId: NODE_ID, applied: true, newClock: getLocalClock().timeString });
    } else {
      try {
        await axios.post(
          `${adj.url}/api/distributed/clock-adjust`,
          { adjustmentMs: adj.adjustmentMs, newOffsetMs: adj.newOffsetMs },
          { timeout: 1500 }
        );
        broadcastResults.push({ nodeId: adj.nodeId, applied: true });
      } catch (err) {
        broadcastResults.push({ nodeId: adj.nodeId, applied: false, error: err.message });
      }
    }
  }

  // 7. Log sync event to fault-tolerance DB
  ftPool.promise().query(
    `INSERT INTO \`clock_sync_log\` (coordinator_id, participating_nodes, collected_clocks, adjustments) 
     VALUES (?, ?, ?, ?)`,
    [
      coordinatorId,
      JSON.stringify(collectedClocks.map(c => c.nodeId)),
      JSON.stringify(collectedClocks),
      JSON.stringify(adjustments)
    ]
  ).catch(err => {
    // Non-fatal
  });

  return {
    coordinatorId,
    participatingNodes: collectedClocks.map(c => c.nodeId),
    unreachableNodes,
    referenceTimestamp: refTime,
    averageAdjustment: avgDiff,
    collectedClocks,
    adjustments,
    synchronizedClocks: collectedClocks.map(c => {
      const adj = adjustments.find(a => a.nodeId === c.nodeId);
      const newTimestamp = c.timestamp + (adj ? adj.adjustmentMs : 0);
      return {
        nodeId: c.nodeId,
        newTimestamp,
        newTimeString: new Date(newTimestamp).toLocaleTimeString(),
        offsetMs: adj ? adj.newOffsetMs : c.offsetMs
      };
    })
  };
}
