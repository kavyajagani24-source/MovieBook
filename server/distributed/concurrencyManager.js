import db from "../config/db.js";
import { NODE_ID, getLocalClock } from "./nodeRegistry.js";
import { replicateBookingToBackup } from "./replicationService.js";

/**
 * Executes a concurrent booking test directly on the database using transactions
 * with pessimistic locking (SELECT ... FOR UPDATE) to ensure atomicity.
 */
export async function runConcurrentBookingTest({
  showId = 1,
  seat = "A5",
  requestCount = 10,
  customerId = 1
}) {
  const startTime = Date.now();
  const requests = [];

  // Normalize seat identifier
  const rawSeat = String(seat).trim();
  let seatNumeric = rawSeat;
  const match = rawSeat.match(/(\d+)/);
  if (match) seatNumeric = Number(match[1]);

  console.log(`[Concurrency] Running test with ${requestCount} simultaneous requests for Show ${showId}, Seat ${rawSeat}`);

  // Create an array of simultaneous booking attempts
  for (let i = 1; i <= requestCount; i++) {
    requests.push(attemptBookingTransaction(i, showId, rawSeat, seatNumeric, customerId));
  }

  // Fire all requests concurrently via Promise.all
  const results = await Promise.all(requests);

  const durationMs = Date.now() - startTime;
  const successfulRequests = results.filter(r => r.status === "SUCCESS").length;
  const failedRequests = results.filter(r => r.status !== "SUCCESS").length;
  const seatConflicts = results.filter(r => r.reason === "SEAT_ALREADY_OCCUPIED").length;

  return {
    testSeat: rawSeat,
    showId,
    totalRequests: requestCount,
    successful: successfulRequests,
    failed: failedRequests,
    seatConflicts,
    executionTimeMs: durationMs,
    processingServer: NODE_ID,
    timestamp: getLocalClock().isoString,
    details: results
  };
}

/**
 * Individual concurrent transaction execution with lock checking.
 */
async function attemptBookingTransaction(reqNumber, showId, rawSeat, seatNumeric, customerId) {
  const reqStartTime = Date.now();
  const conn = await db.promise().getConnection();

  try {
    // 1. Begin SQL Transaction
    await conn.beginTransaction();

    // 2. Concurrency Control: Check if seat is booked for this show with pessimistic lock
    const [existingTickets] = await conn.query(
      "SELECT ticket_no FROM `Tickets` WHERE show_id = ? AND (seat_no = ? OR seat_no = ?) FOR UPDATE",
      [showId, rawSeat, seatNumeric]
    );

    if (existingTickets.length > 0) {
      await conn.rollback();
      return {
        requestId: reqNumber,
        status: "FAILED",
        reason: "SEAT_ALREADY_OCCUPIED",
        message: `Request ${reqNumber} -> FAILED: Seat ${rawSeat} already occupied`,
        timeTakenMs: Date.now() - reqStartTime
      };
    }

    // 3. Atomically Insert Ticket
    const [ticketRes] = await conn.query(
      "INSERT INTO `Tickets` (show_id, show_date, show_time, seat_no, hall_no, t_id, price, admin_id) VALUES (?, CURRENT_DATE(), '18:00', ?, 1, 1, 250.00, 1)",
      [showId, seatNumeric]
    );
    const ticketNo = ticketRes.insertId;

    // 4. Atomically Insert Booking
    const [bookingRes] = await conn.query(
      "INSERT INTO `Booking` (ticket_no, c_id, total_price) VALUES (?, ?, 250.00)",
      [ticketNo, customerId]
    );
    const bookingId = bookingRes.insertId;

    // 5. Commit Transaction
    await conn.commit();

    // 6. Asynchronously trigger replication to backup node
    replicateBookingToBackup({
      bookingId,
      customerId,
      showId,
      ticketNo,
      seatData: JSON.stringify([{ seat_no: rawSeat, price: 250 }]),
      totalPrice: 250.00,
      sourceNodeId: NODE_ID
    }).catch(err => console.warn("[Replication] Async warning:", err.message));

    return {
      requestId: reqNumber,
      status: "SUCCESS",
      bookingId,
      ticketNo,
      message: `Request ${reqNumber} -> SUCCESS: Booked Seat ${rawSeat} (Booking #${bookingId})`,
      timeTakenMs: Date.now() - reqStartTime
    };
  } catch (err) {
    await conn.rollback();
    return {
      requestId: reqNumber,
      status: "FAILED",
      reason: "TRANSACTION_ERROR",
      message: `Request ${reqNumber} -> FAILED: ${err.message}`,
      timeTakenMs: Date.now() - reqStartTime
    };
  } finally {
    conn.release();
  }
}
