import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/shows - fetch all shows
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Shows` LIMIT 100");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shows/movie/:m_id
router.get("/movie/:m_id", async (req, res) => {
  const { m_id } = req.params;
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Shows` WHERE m_id = ?", [m_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shows
router.post("/", async (req, res) => {
  const { st_time, end_time, language, duration_weeks, m_id, t_id } = req.body;
  try {
    const [r] = await db.promise().query(
      "INSERT INTO `Shows` (st_time,end_time,language,duration_weeks,m_id,t_id) VALUES (?,?,?,?,?,?)",
      [st_time, end_time, language, duration_weeks, m_id, t_id]
    );
    res.status(201).json({ show_id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
