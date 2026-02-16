import express from "express";
import db from "../config/db.js";

const router = express.Router();

// GET /api/debug/tickets - last 20 tickets
router.get("/tickets", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Tickets` ORDER BY ticket_no DESC LIMIT 20");
    res.json(rows);
  } catch (err) {
    console.error('Debug tickets error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/bookings - last 20 bookings
router.get("/bookings", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Booking` ORDER BY booking_id DESC LIMIT 20");
    res.json(rows);
  } catch (err) {
    console.error('Debug bookings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
