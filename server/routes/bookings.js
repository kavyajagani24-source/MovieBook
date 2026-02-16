import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/bookings/customer/:c_id (get bookings for a specific customer)
router.get("/customer/:c_id", async (req, res) => {
  const { c_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT b.booking_id, b.booking_date, b.total_price, b.offer_id, t.ticket_no, t.seat_no, t.show_date, t.show_time, s.show_id, m.m_name, th.t_name, th.location
       FROM Booking b
       JOIN Tickets t ON b.ticket_no = t.ticket_no
       JOIN Shows s ON t.show_id = s.show_id
       JOIN Movie m ON s.m_id = m.m_id
       JOIN Theatre th ON t.t_id = th.t_id
       WHERE b.c_id = ? ORDER BY b.booking_date DESC`,
      [c_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/all (get all bookings - admin)
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Booking` ORDER BY booking_date DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings (list all bookings - same as /all)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Booking` ORDER BY booking_date DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings (create a booking)
router.post("/", async (req, res) => {
  const { ticket_no, c_id, booking_date, total_price, offer_id } = req.body;
  console.log('POST /api/bookings body ->', req.body);
  try {
    // Validate required fields
    if (!ticket_no || !c_id) {
      return res.status(400).json({ error: "ticket_no and c_id are required" });
    }

    // If booking_date not provided, let MySQL use CURRENT_TIMESTAMP by omitting the column
    // If provided as a date string (e.g. "2025-11-11"), append time to make it a valid datetime string
    let query;
    let params;
    
    if (booking_date) {
      // Ensure booking_date is a valid datetime format (append time if only date provided)
      const dateTime = booking_date.includes('T') || booking_date.includes(' ') 
        ? booking_date 
        : `${booking_date} 00:00:00`;
      query = "INSERT INTO `Booking` (booking_date, ticket_no, c_id, total_price, offer_id) VALUES (?,?,?,?,?)";
      params = [dateTime, ticket_no, c_id, total_price || 0, offer_id || null];
    } else {
      // Use CURRENT_TIMESTAMP if no date provided
      query = "INSERT INTO `Booking` (ticket_no, c_id, total_price, offer_id) VALUES (?,?,?,?)";
      params = [ticket_no, c_id, total_price || 0, offer_id || null];
    }
    
    const [r] = await db.promise().query(query, params);
    console.log('Booking created id ->', r.insertId);
    res.status(201).json({ booking_id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;