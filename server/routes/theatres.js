import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/theatres
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Theatre`");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/theatres
router.post("/", async (req, res) => {
  const { t_name, location } = req.body;
  try {
    const [r] = await db.promise().query("INSERT INTO `Theatre` (t_name, location) VALUES (?,?)", [t_name, location]);
    res.status(201).json({ t_id: r.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;