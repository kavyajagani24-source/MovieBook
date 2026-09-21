import axios from "axios";
import ftPool from "../config/ftDb.js";
import db from "../config/db.js";
import {
  NODE_ID,
  NODE_ROLE,
  CLUSTER_PEERS,
  setBackupPromoted,
  getIsBackupPromoted
} from "./nodeRegistry.js";

/**
 * Replicates committed booking data from any active application server
 * to the dedicated Backup Server (Node 4) and persists to moviebooking_fault_tolerance.
 */
export async function replicateBookingToBackup({
  bookingId,
  customerId,
  showId,
  ticketNo,
  seatData,
  totalPrice = 0.00,
  sourceNodeId = NODE_ID
}) {
  const backupPeer = CLUSTER_PEERS.find(p => p.role === "BACKUP" || p.nodeId === 4);
  const nowStr = new Date().toISOString();

  // If this node IS the backup node, write directly to FT Database
  if (NODE_ID === 4) {
    return await saveToFaultToleranceDb({
      bookingId,
      customerId,
      showId,
      ticketNo,
      seatData,
      totalPrice,
      sourceNodeId,
      nowStr
    });
  }

  // Otherwise, if this is an Application Server (Node 1, 2, 3), transmit to Backup Node over HTTP RPC
  try {
    if (backupPeer) {
      const resp = await axios.post(`${backupPeer.url}/api/distributed/replication/receive`, {
        bookingId,
        customerId,
        showId,
        ticketNo,
        seatData,
        totalPrice,
        sourceNodeId
      }, { timeout: 2500 });

      // Update replication status in Main DB metadata
      await db.promise().query(
        "UPDATE `distributed_booking_metadata` SET replication_status = 'REPLICATED' WHERE booking_id = ?",
        [bookingId]
      ).catch(() => {});

      return { success: true, backupResponse: resp.data };
    }
  } catch (err) {
    console.warn(`[Replication] Backup server (${backupPeer?.url}) unreachable: ${err.message}. Direct fallback to FT DB.`);
  }

  // Fallback: In case Backup HTTP server is temporarily restarting, write directly to FT DB
  return await saveToFaultToleranceDb({
    bookingId,
    customerId,
    showId,
    ticketNo,
    seatData,
    totalPrice,
    sourceNodeId,
    nowStr
  });
}

/**
 * Persists replicated booking record and replication log in moviebooking_fault_tolerance
 */
export async function saveToFaultToleranceDb({
  bookingId,
  customerId,
  showId,
  ticketNo,
  seatData,
  totalPrice,
  sourceNodeId,
  nowStr = new Date().toISOString()
}) {
  try {
    const seatString = typeof seatData === "string" ? seatData : JSON.stringify(seatData);

    // 1. Insert or update into replicated_bookings
    await ftPool.promise().query(
      `INSERT INTO \`replicated_bookings\` 
       (source_booking_id, customer_id, show_id, ticket_no, seat_data, total_price, source_node_id, version, event_type, event_timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'BOOKING_CREATED', ?)
       ON DUPLICATE KEY UPDATE 
         version = version + 1,
         seat_data = VALUES(seat_data),
         total_price = VALUES(total_price),
         replicated_at = CURRENT_TIMESTAMP`,
      [bookingId, customerId, showId, ticketNo, seatString, totalPrice, sourceNodeId, nowStr]
    );

    // 2. Insert into replication_log
    await ftPool.promise().query(
      `INSERT INTO \`replication_log\` 
       (source_node_id, destination_node_id, entity_type, entity_id, operation, status) 
       VALUES (?, 4, 'BOOKING', ?, 'INSERT', 'SUCCESS')`,
      [sourceNodeId, bookingId]
    );

    // 3. Mark replication in main DB if accessible
    db.promise().query(
      "UPDATE `distributed_booking_metadata` SET replication_status = 'REPLICATED' WHERE booking_id = ?",
      [bookingId]
    ).catch(() => {});

    return { success: true, bookingId, replicatedTo: "moviebooking_fault_tolerance" };
  } catch (err) {
    console.error("[ReplicationService] Error saving to FT DB:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get current replication health and counts
 */
export async function getReplicationStatus() {
  try {
    const [countRows] = await ftPool.promise().query("SELECT COUNT(*) AS totalReplicated FROM `replicated_bookings`");
    const [recentRows] = await ftPool.promise().query(
      "SELECT * FROM `replicated_bookings` ORDER BY replicated_at DESC LIMIT 15"
    );
    const [logRows] = await ftPool.promise().query(
      "SELECT * FROM `replication_log` ORDER BY timestamp DESC LIMIT 15"
    );

    return {
      faultToleranceDb: "moviebooking_fault_tolerance",
      status: "ACTIVE",
      totalReplicatedBookings: countRows[0]?.totalReplicated || 0,
      recentReplicatedBookings: recentRows,
      recentLogs: logRows,
      isBackupPromoted: getIsBackupPromoted()
    };
  } catch (err) {
    return {
      faultToleranceDb: "moviebooking_fault_tolerance",
      status: "DEGRADED",
      error: err.message,
      totalReplicatedBookings: 0,
      recentReplicatedBookings: [],
      recentLogs: [],
      isBackupPromoted: getIsBackupPromoted()
    };
  }
}
