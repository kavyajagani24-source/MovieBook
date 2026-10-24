import express from "express";
import db from "../config/db.js";
import {
  NODE_ID,
  NODE_ROLE,
  getLocalClock,
  getCoordinator,
  getSimulatedOffline
} from "../distributed/nodeRegistry.js";
import { replicateBookingToBackup } from "../distributed/replicationService.js";
import { logDistributedRequest } from "../distributed/requestLogger.js";
import { ensureSeatLabelColumn } from "./tickets.js";

const router = express.Router();

// POST /api/checkout
// Body: { show_id, show_date, show_time, seats: [{ seat_no, price }], hall_no, t_id, admin_id, c_id, offer_id }
router.post("/", async (req, res) => {
  const reqStart = Date.now();
  const idempotencyKey = req.headers["x-booking-request-id"] || req.body.idempotencyKey;

  // 1. Failover / Simulated Offline Check
  if (getSimulatedOffline()) {
    console.warn(`[Node ${NODE_ID}] Rejecting checkout: Node simulated OFFLINE.`);
    return res.status(503).json({
      error: `Server ${NODE_ID} is temporarily OFFLINE (Simulated Failover)`,
      serverId: NODE_ID
    });
  }

  // 2. Idempotency Check: Prevent duplicate bookings if client retries due to network hiccup
  if (idempotencyKey) {
    try {
      const [existing] = await db.promise().query(
        "SELECT response_body FROM `idempotency_keys` WHERE idempotency_key = ?",
        [idempotencyKey]
      );
      if (existing.length > 0 && existing[0].response_body) {
        console.log(`[Node ${NODE_ID}] Idempotent request hit for key ${idempotencyKey}`);
        return res.status(200).json(JSON.parse(existing[0].response_body));
      }
    } catch (e) {
      // Non-fatal, proceed with checkout
    }
  }

  const { show_id, show_date, show_time, seats, hall_no, t_id, price: total_price, admin_id, c_id, offer_id } = req.body;
  if (!Array.isArray(seats) || seats.length === 0) return res.status(400).json({ error: 'seats are required' });
  if (!c_id) return res.status(400).json({ error: 'c_id is required' });

  const conn = await db.promise().getConnection();
  const hasSeatLabel = await ensureSeatLabelColumn();
  try {
    // 3. Begin Transaction with Concurrency Isolation
    await conn.beginTransaction();

    const createdTickets = [];
    const createdBookings = [];
    const localClock = getLocalClock();

    for (const s of seats) {
      const rawSeat = s.seat_no ?? (s.row && s.number ? `${s.row}${s.number}` : s);
      const seatPrice = s.price ?? s.p ?? 0;

      // Normalize seat value for DB: prefer numeric seat number when possible
      let seatValue = rawSeat;
      if (typeof rawSeat === 'string') {
        const m = rawSeat.match(/(\d+)/);
        if (m) seatValue = Number(m[1]);
        else seatValue = rawSeat.slice(0, 8);
      }

      // 4. Concurrency Protection: Lock seat for update to prevent race conditions / double bookings
      const [existingSeat] = await conn.query(
        `SELECT ticket_no FROM \`Tickets\`
         WHERE show_id = ?
           AND (
             COALESCE(seat_label, '') = ?
             OR (COALESCE(seat_label, '') = '' AND seat_no::text = ?::text)
           )
         FOR UPDATE`,
        [show_id, String(rawSeat), String(seatValue)]
      );

      if (existingSeat.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          error: `Seat ${rawSeat} is already booked for this show. Please select another seat.`,
          seatConflict: rawSeat,
          serverId: NODE_ID
        });
      }

      // 5. Insert Ticket atomically. seat_no stays numeric for older rows; seat_label keeps "C5".
      const seatLabel = String(rawSeat).slice(0, 16);
      const [ticketRes] = hasSeatLabel
        ? await conn.query(
            "INSERT INTO `Tickets` (show_id, show_date, show_time, seat_no, seat_label, hall_no, t_id, price, admin_id) VALUES (?,?,?,?,?,?,?,?,?)",
            [show_id, show_date || new Date().toISOString().split('T')[0], show_time || '18:00', seatValue, seatLabel, hall_no || 1, t_id || 1, seatPrice, admin_id || null]
          )
        : await conn.query(
            "INSERT INTO `Tickets` (show_id, show_date, show_time, seat_no, hall_no, t_id, price, admin_id) VALUES (?,?,?,?,?,?,?,?)",
            [show_id, show_date || new Date().toISOString().split('T')[0], show_time || '18:00', seatValue, hall_no || 1, t_id || 1, seatPrice, admin_id || null]
          );

      const ticketNo = ticketRes.insertId;
      createdTickets.push(ticketNo);

      // 6. Insert Booking atomically
      const [bookingRes] = await conn.query(
        "INSERT INTO `Booking` (ticket_no, c_id, total_price, offer_id) VALUES (?,?,?,?)",
        [ticketNo, c_id, seatPrice, offer_id || null]
      );

      const bookingId = bookingRes.insertId;
      createdBookings.push(bookingId);

      // 7. Stamp Distributed Booking Metadata in Main DB
      await conn.query(
        `INSERT INTO \`distributed_booking_metadata\` 
         (booking_id, node_id, node_role, distributed_timestamp, coordinator_id, replication_status) 
         VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [bookingId, NODE_ID, NODE_ROLE, localClock.isoString, getCoordinator()]
      );

      // 8. Replicate committed booking to dedicated Backup Server & FT DB
      replicateBookingToBackup({
        bookingId,
        customerId: c_id,
        showId: show_id,
        ticketNo,
        seatData: JSON.stringify(seats),
        totalPrice: seatPrice,
        sourceNodeId: NODE_ID
      }).catch(err => console.warn(`[Node ${NODE_ID}] Replication async error:`, err.message));
    }

    // Commit Transaction
    await conn.commit();
    console.log(`[Node ${NODE_ID}] Successfully processed checkout for customer ${c_id}. Bookings:`, createdBookings);

    const responsePayload = {
      success: true,
      tickets: createdTickets,
      bookings: createdBookings,
      processedByNodeId: NODE_ID,
      processedByRole: NODE_ROLE,
      distributedTimestamp: localClock.isoString,
      coordinatorId: getCoordinator()
    };

    // Save idempotency key response if provided
    if (idempotencyKey) {
      db.promise().query(
        "INSERT INTO `idempotency_keys` (idempotency_key, booking_id, response_body) VALUES (?, ?, ?)",
        [idempotencyKey, createdBookings[0], JSON.stringify(responsePayload)]
      ).catch(() => {});
    }

    // Log distributed request
    logDistributedRequest({
      clientIp: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
      httpMethod: "POST",
      endpoint: "/api/checkout",
      serverId: NODE_ID,
      durationMs: Date.now() - reqStart,
      statusCode: 201,
      success: true
    });

    res.status(201).json(responsePayload);
  } catch (err) {
    await conn.rollback();
    console.error(`[Node ${NODE_ID}] Checkout transaction failed:`, err);

    logDistributedRequest({
      clientIp: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
      httpMethod: "POST",
      endpoint: "/api/checkout",
      serverId: NODE_ID,
      durationMs: Date.now() - reqStart,
      statusCode: 500,
      success: false
    });

    res.status(500).json({ error: err.message, serverId: NODE_ID });
  } finally {
    conn.release();
  }
});

export default router;
