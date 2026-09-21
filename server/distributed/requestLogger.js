import ftPool from "../config/ftDb.js";
import { NODE_ID } from "./nodeRegistry.js";

// In-memory ring buffer for fast real-time dashboard viewing
const memoryLogs = [];
const MAX_LOGS = 100;

export async function logDistributedRequest({
  requestId,
  clientIp,
  httpMethod,
  endpoint,
  serverId = NODE_ID,
  rpcMethod = null,
  durationMs,
  statusCode,
  success = true
}) {
  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    requestId: requestId || `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    clientIp: clientIp || "127.0.0.1",
    httpMethod: httpMethod || "GET",
    endpoint: endpoint || "/",
    serverId: Number(serverId),
    rpcMethod: rpcMethod || null,
    durationMs: Math.round(durationMs || 0),
    statusCode: Number(statusCode || 200),
    success: Boolean(success),
    timestamp: new Date().toISOString()
  };

  // Add to memory ring
  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs.pop();
  }

  // Persist asynchronously to Fault-Tolerance Database without blocking main thread
  ftPool.promise().query(
    `INSERT INTO \`distributed_request_log\` 
     (request_id, client_ip, http_method, endpoint, server_id, rpc_method, duration_ms, status_code, success) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.requestId,
      entry.clientIp,
      entry.httpMethod,
      entry.endpoint,
      entry.serverId,
      entry.rpcMethod,
      entry.durationMs,
      entry.statusCode,
      entry.success ? 1 : 0
    ]
  ).catch(err => {
    // Non-fatal if FT DB is temporarily unavailable
    // console.warn("[RequestLogger] FT DB write skipped:", err.message);
  });

  return entry;
}

export function getRecentRequestLogs(limit = 30) {
  return memoryLogs.slice(0, limit);
}
