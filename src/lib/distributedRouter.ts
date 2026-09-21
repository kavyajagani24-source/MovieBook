import axios from 'axios';

// Cluster Node Pool (Servers 1-3 active, Node 4 backup/failover)
export const CLUSTER_NODES: { id: number; url: string; defaultPort: number }[] = [
  { id: 1, url: 'http://localhost:5000', defaultPort: 5000 },
  { id: 2, url: 'http://localhost:5001', defaultPort: 5001 },
  { id: 3, url: 'http://localhost:5002', defaultPort: 5002 },
  { id: 4, url: 'http://localhost:5003', defaultPort: 5003 }
];

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
 * Each attempt probes /health first so simulated-OFFLINE nodes are correctly skipped.
 */
export async function routeDistributedCheckout(payload: any, preferredNodeId?: number) {
  // Unique idempotency key prevents double-booking if client retries after network hiccup
  const idempotencyKey = `book-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Build ordered candidate list — preferred node first, then rest in order
  let candidateNodes = preferredNodeId
    ? [CLUSTER_NODES.find(n => n.id === preferredNodeId)!].filter(Boolean)
    : CLUSTER_NODES;

  let lastError: any = null;

  for (const node of candidateNodes) {
    // Always do a fresh health check before attempting booking
    let nodeIsOnline = false;
    try {
      const healthResp = await axios.get(`${node.url}/api/distributed/health`, { timeout: 600 });
      nodeIsOnline = healthResp.data?.status === 'ONLINE';
    } catch {
      nodeIsOnline = false;
    }

    if (!nodeIsOnline) {
      console.log(`[DistributedRouter] Skipping Node ${node.id} — OFFLINE or unreachable.`);
      continue;
    }

    try {
      console.log(`[DistributedRouter] Sending checkout to Node ${node.id} (${node.url})...`);
      const authToken = localStorage.getItem('auth_token');
      const resp = await axios.post(`${node.url}/api/checkout`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Request-ID': idempotencyKey,
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        timeout: 4000
      });
      console.log(`[DistributedRouter] ✅ Booking processed by Node ${node.id}`);
      return resp;
    } catch (err: any) {
      console.warn(`[DistributedRouter] Node ${node.id} checkout failed:`, err.message);
      lastError = err;
      // Seat conflict — don't retry other servers, the seat is genuinely taken
      if (err.response?.status === 409) {
        throw err;
      }
      // 503 = node is simulating OFFLINE — skip to next
    }
  }

  throw lastError || new Error('All distributed servers are currently unreachable or offline.');
}
