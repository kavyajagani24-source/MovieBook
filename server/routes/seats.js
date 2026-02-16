import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/seats/theatre/:t_id
router.get("/theatre/:t_id", async (req, res) => {
  const { t_id } = req.params;
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Seats` WHERE t_id=?", [t_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/seats
router.post("/", async (req, res) => {
  const { seat_name, no_of_seats, t_id } = req.body;
  try {
    const [r] = await db.promise().query("INSERT INTO `Seats` (seat_name,no_of_seats,t_id) VALUES (?,?,?)", [seat_name, no_of_seats, t_id]);
    res.status(201).json({ seat_id: r.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;