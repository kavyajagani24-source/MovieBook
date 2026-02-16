import express from "express";
import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth.js";
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Admin login
router.post("/login", async (req, res) => {
  const { admin_id, password } = req.body;
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Admin` WHERE admin_id = ?", [admin_id]);
    if (!rows.length) return res.status(400).json({ error: "Invalid credentials" });
    const admin = rows[0];
    const valid = admin.password === password || await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ admin_id: admin.admin_id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ admin_id: admin.admin_id, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const admin_id = req.user?.admin_id || 1; // Get admin_id from token or default to 1

    // Total revenue from all bookings (sum of booking total_price, not ticket price)
    const [[{ total_revenue }]] = await db.promise().query(
      "SELECT SUM(b.total_price) AS total_revenue FROM `Booking` b"
    );

    // Total bookings created by this admin
    const [bookingsCount] = await db.promise().query(
      "SELECT COUNT(*) AS cnt FROM `Booking`",
      [admin_id]
    );

    // Active movies (movies that have at least one show entry)
    const [activeMovies] = await db.promise().query(
      "SELECT COUNT(DISTINCT m.m_id) AS cnt FROM `Movie` m JOIN `Shows` s ON m.m_id = s.m_id"
    );

    // Registered customers (total count in Customer table)
    const [customersCount] = await db.promise().query("SELECT COUNT(*) AS cnt FROM `Customer`");

    res.json({
      total_revenue: Number(total_revenue || 0),
      total_bookings: Number(bookingsCount[0]?.cnt || 0),
      total_movies: Number(activeMovies[0]?.cnt || 0),
      total_customers: Number(customersCount[0]?.cnt || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Public stats (no auth) - returns global aggregates
router.get("/stats/public", async (req, res) => {
  try {
    // Global total revenue from bookings (sum of booking total_price)
    const [[{ total_revenue }]] = await db.promise().query(
      "SELECT SUM(b.total_price) AS total_revenue FROM `Booking` b"
    );

    // Global total bookings
    const [bookingsCount] = await db.promise().query("SELECT COUNT(*) AS cnt FROM `Booking`");

    // Active movies (movies that have at least one show entry)
    const [activeMovies] = await db.promise().query(
      "SELECT COUNT(DISTINCT m.m_id) AS cnt FROM `Movie` m JOIN `Shows` s ON m.m_id = s.m_id"
    );

    // Registered customers (total count in Customer table)
    const [customersCount] = await db.promise().query("SELECT COUNT(*) AS cnt FROM `Customer`");

    res.json({
      total_revenue: Number(total_revenue || 0),
      total_bookings: Number(bookingsCount[0]?.cnt || 0),
      total_movies: Number(activeMovies[0]?.cnt || 0),
      total_customers: Number(customersCount[0]?.cnt || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;