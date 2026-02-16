import express from "express";
import db from "../config/db.js";
const router = express.Router();

// POST /api/checkout
// Body: { show_id, show_date, show_time, seats: [{ seat_no, price }], hall_no, t_id, admin_id, c_id, offer_id }
router.post("/", async (req, res) => {
  const { show_id, show_date, show_time, seats, hall_no, t_id, price: total_price, admin_id, c_id, offer_id } = req.body;
  if (!Array.isArray(seats) || seats.length === 0) return res.status(400).json({ error: 'seats are required' });
  if (!c_id) return res.status(400).json({ error: 'c_id is required' });

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const createdTickets = [];
    const createdBookings = [];

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

      const [ticketRes] = await conn.query(
        "INSERT INTO `Tickets` (show_id, show_date, show_time, seat_no, hall_no, t_id, price, admin_id) VALUES (?,?,?,?,?,?,?,?)",
        [show_id, show_date, show_time, seatValue, hall_no || 1, t_id || 1, seatPrice, admin_id || null]
      );

      const ticketNo = ticketRes.insertId;
      createdTickets.push(ticketNo);

      const [bookingRes] = await conn.query(
        "INSERT INTO `Booking` (ticket_no, c_id, total_price, offer_id) VALUES (?,?,?,?)",
        [ticketNo, c_id, seatPrice, offer_id || null]
      );

      createdBookings.push(bookingRes.insertId);
    }

    await conn.commit();
    res.status(201).json({ tickets: createdTickets, bookings: createdBookings });
  } catch (err) {
    await conn.rollback();
    console.error('Checkout transaction failed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
