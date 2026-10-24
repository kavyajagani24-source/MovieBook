import os from "os";
import dotenv from "dotenv";
dotenv.config();

// Determine configuration for this specific running instance
export const NODE_ID = Number(process.env.NODE_ID || 1);
export const NODE_ROLE = process.env.NODE_ROLE || (NODE_ID === 4 ? "BACKUP" : "SERVER");
export const PORT = Number(process.env.PORT || 5000);

// Clock offset in milliseconds for Berkeley simulation
let localClockOffsetMs = Number(process.env.CLOCK_OFFSET_MS || (NODE_ID === 1 ? 5000 : NODE_ID === 2 ? -3000 : NODE_ID === 3 ? 8000 : 0));

// Node state flags
let isSimulatedOffline = false;
let currentCoordinatorId = 1;
let isPrimaryNode = NODE_ID === 1;
let isBackupPromoted = false;

// Peer topology
export const CLUSTER_PEERS = [
  { nodeId: 1, role: "SERVER", port: 5000, url: process.env.NODE1_URL || "http://localhost:5000" },
  { nodeId: 2, role: "SERVER", port: 5001, url: process.env.NODE2_URL || "http://localhost:5001" },
  { nodeId: 3, role: "SERVER", port: 5002, url: process.env.NODE3_URL || "http://localhost:5002" },
  { nodeId: 4, role: "BACKUP", port: 5003, url: process.env.BACKUP_URL || "http://localhost:5003" }
];

export function getLocalClock() {
  const now = Date.now();
  const adjusted = now + localClockOffsetMs;
  return {
    rawTimestamp: now,
    offsetMs: localClockOffsetMs,
    distributedTimestamp: adjusted,
    isoString: new Date(adjusted).toISOString(),
    timeString: new Date(adjusted).toLocaleTimeString()
  };
}

export function setLocalClockOffset(offsetMs) {
  localClockOffsetMs = Number(offsetMs);
  return localClockOffsetMs;
}

export function getLocalClockOffset() {
  return localClockOffsetMs;
}

export function setSimulatedOffline(status) {
  isSimulatedOffline = Boolean(status);
  return isSimulatedOffline;
}

export function getSimulatedOffline() {
  return isSimulatedOffline;
}

export function setCoordinator(id) {
  currentCoordinatorId = Number(id);
  return currentCoordinatorId;
}

export function getCoordinator() {
  return currentCoordinatorId;
}

export function setPrimary(status) {
  isPrimaryNode = Boolean(status);
  return isPrimaryNode;
}

export function getIsPrimary() {
  return isPrimaryNode;
}

export function setBackupPromoted(status) {
  isBackupPromoted = Boolean(status);
  return isBackupPromoted;
}

export function getIsBackupPromoted() {
  return isBackupPromoted;
}

export function getLocalNodeInfo() {
  const clock = getLocalClock();
  return {
    nodeId: NODE_ID,
    role: (NODE_ID === 4 && isBackupPromoted) ? "PRIMARY" : NODE_ROLE,
    port: Number(process.env.PUBLIC_PORT || PORT),
    listenPort: PORT,
    hostname: os.hostname(),
    runtime: process.env.RUNTIME || "process",
    status: isSimulatedOffline ? "OFFLINE" : "ONLINE",
    currentClock: clock.isoString,
    clockTime: clock.timeString,
    clockOffsetMs: localClockOffsetMs,
    currentCoordinator: currentCoordinatorId,
    isPrimary: (NODE_ID === 4 && isBackupPromoted) ? true : isPrimaryNode,
    lastHeartbeat: new Date().toISOString()
  };
}
