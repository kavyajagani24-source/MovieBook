import axios from 'axios';

// Cluster Node Pool (Servers 1-3 active, Node 4 backup/failover)
export const CLUSTER_NODES: { id: number; url: string; defaultPort: number }[] = [
  { id: 1, url: 'http://localhost:5000', defaultPort: 5000 },
  { id: 2, url: 'http://localhost:5001', defaultPort: 5001 },
  { id: 3, url: 'http://localhost:5002', defaultPort: 5002 },
  { id: 4, url: 'http://localhost:5003', defaultPort: 5003 }
];

const BACKUP_NODE = CLUSTER_NODES[3]; // Node 4

/**
 * Checks if Node 4 (Backup) has been promoted to Primary.
 * Returns the node info if promoted and online, otherwise null.
 */
export async function getPromotedBackupNode(): Promise<{ id: number; url: string; defaultPort: number } | null> {
  try {
    const resp = await axios.get(`${BACKUP_NODE.url}/api/distributed/status`, { timeout: 800 });
    if (resp.data?.isBackupPromoted && resp.data?.status === 'ONLINE') {
      return BACKUP_NODE;
    }
  } catch {
    // Backup unreachable
  }
  return null;
}

/**
 * Checks if a node is ONLINE by probing its health endpoint.
 */
async function isNodeOnline(url: string): Promise<boolean> {
  try {
    const resp = await axios.get(`${url}/api/distributed/health`, { timeout: 700 });
    return resp.data?.status === 'ONLINE';
  } catch {
    return false;
  }
}

// NO caching — always probe live so simulated failures are immediately detected
export async function getHealthyServerUrl(preferredNodeId?: number): Promise<string> {
  // If admin explicitly targets a specific node, skip discovery and go directly
  if (preferredNodeId) {
    const target = CLUSTER_NODES.find(n => n.id === preferredNodeId);
    if (target) return target.url;
  }

  // Probe all 4 nodes in order and return the FIRST one that is genuinely ONLINE
  for (const node of CLUSTER_NODES) {
    try {
      const resp = await axios.get(`${node.url}/api/distributed/health`, { timeout: 800 });
      if (resp.data && resp.data.status === 'ONLINE') {
        return node.url;
      }
      // status === 'OFFLINE' means the node is up but simulating failure — skip it
    } catch {
      // Node process is completely down — skip it
    }
  }

  // All nodes unreachable — last resort fallback (will fail gracefully at checkout)
  return 'http://localhost:5000';
}

/**
 * Routes a checkout request with automatic retry and idempotency key.
 *
 * Failover logic:
 * - If a preferredNodeId is given and that node is OFFLINE, the router checks
 *   whether the Backup Server (Node 4) has been promoted to Primary.
 * - If promoted, it transparently redirects the request to Node 4 and marks
 *   the response with `redirectedToBackup: true` so the UI can surface it.
 * - Without a preferred node, all healthy nodes (including promoted backup) are tried.
 */
export async function routeDistributedCheckout(
  payload: any,
  preferredNodeId?: number
): Promise<any> {
  // Unique idempotency key prevents double-booking if client retries after network hiccup
  const idempotencyKey = `book-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const authToken = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    'X-Booking-Request-ID': idempotencyKey,
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
  };

  // --- Helper: attempt checkout on a specific node ---
  const attemptCheckout = async (node: typeof CLUSTER_NODES[0]) => {
    console.log(`[DistributedRouter] Sending checkout to Node ${node.id} (${node.url})...`);
    const resp = await axios.post(`${node.url}/api/checkout`, payload, { headers, timeout: 4000 });
    console.log(`[DistributedRouter] ✅ Booking processed by Node ${node.id}`);
    return resp;
  };

  // ── TARGETED PROBE MODE (admin selected a specific server) ──────────────────
  if (preferredNodeId) {
    const targetNode = CLUSTER_NODES.find(n => n.id === preferredNodeId);
    if (!targetNode) throw new Error(`Node ${preferredNodeId} not found in cluster topology.`);

    // Check if the targeted node is online
    const online = await isNodeOnline(targetNode.url);

    if (online) {
      // Target is healthy — send directly
      return await attemptCheckout(targetNode);
    }

    // Target is OFFLINE — check if backup was promoted to Primary
    console.warn(`[DistributedRouter] Node ${preferredNodeId} is OFFLINE. Checking backup promotion status...`);
    const promotedBackup = await getPromotedBackupNode();

    if (promotedBackup) {
      console.log(`[DistributedRouter] 🔄 Node ${preferredNodeId} is DOWN. Backup Node 4 is promoted PRIMARY — redirecting.`);
      const resp = await attemptCheckout(promotedBackup);
      // Attach failover metadata so the UI can display it
      (resp as any).data = {
        ...(resp as any).data,
        redirectedToBackup: true,
        originalTarget: preferredNodeId,
        servedBy: 4,
        failoverReason: `Node ${preferredNodeId} is OFFLINE. Backup Server (Node 4) is promoted PRIMARY and handled the request.`
      };
      return resp;
    }

    // Backup not promoted or also offline — hard fail so demo is honest
    throw new Error(
      `Node ${preferredNodeId} is OFFLINE and Backup Server is not promoted to Primary. ` +
      `Please promote the Backup Server first in the Fault Tolerance tab.`
    );
  }

  // ── AUTO-ROUTE MODE (no specific target, pick best healthy node) ────────────
  // Build full candidate list: Nodes 1-3 first, then backup if promoted
  const promotedBackup = await getPromotedBackupNode();
  const candidateNodes = [
    ...CLUSTER_NODES.filter(n => n.id !== 4),
    ...(promotedBackup ? [promotedBackup] : [])
  ];

  let lastError: any = null;

  for (const node of candidateNodes) {
    const online = await isNodeOnline(node.url);
    if (!online) {
      console.log(`[DistributedRouter] Skipping Node ${node.id} — OFFLINE or unreachable.`);
      continue;
    }

    try {
      return await attemptCheckout(node);
    } catch (err: any) {
      console.warn(`[DistributedRouter] Node ${node.id} checkout failed:`, err.message);
      lastError = err;
      // Seat conflict — don't retry other servers, the seat is genuinely taken
      if (err.response?.status === 409) throw err;
    }
  }

  throw lastError || new Error('All distributed servers are currently unreachable or offline.');
}
