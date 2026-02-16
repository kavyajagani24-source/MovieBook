import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Simple health endpoint to check server + DB connectivity
router.get("/", async (req, res) => {
  try {
    // quick query to validate DB connection
    const [rows] = await db.promise().query("SELECT 1 as ok");
    res.json({ ok: true, db: Array.isArray(rows) ? rows[0] : null });
  } catch (err) {
    console.error('Health check DB error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
