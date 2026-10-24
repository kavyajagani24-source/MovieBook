import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/movies
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Movie` ORDER BY release_date DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// GET /api/movies/:m_id/shows — must be registered before /:m_id is not required,
// but a two-segment path never matches /:m_id. Kept here so the seat flow can load real shows.
router.get("/:m_id/shows", async (req, res) => {
  const { m_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT s.*, m.m_name, th.t_name, th.location
       FROM \`Shows\` s
       LEFT JOIN \`Movie\` m ON s.m_id = m.m_id
       LEFT JOIN \`Theatre\` th ON s.t_id = th.t_id
       WHERE s.m_id = ?
       ORDER BY s.st_time`,
      [m_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

// GET /api/movies/:m_id
router.get("/:m_id", async (req, res) => {
  const { m_id } = req.params;
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Movie` WHERE m_id = ?", [m_id]);
    if (!rows.length) return res.status(404).json({ error: "Movie not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch movie" });
  }
});

// POST /api/movies
router.post("/", async (req, res) => {
  const { m_name, release_date, director, actors, poster_url, trailer_url, description, duration_minutes, language, rating } = req.body;
  try {
    const [result] = await db.promise().query(
      "INSERT INTO `Movie` (m_name, release_date, director, actors, poster_url, trailer_url, description, duration_minutes, language, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [m_name, release_date || null, director || null, actors || null, poster_url || null, trailer_url || null, description || null, duration_minutes || null, language || null, rating || null]
    );
    res.status(201).json({ m_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create movie" });
  }
});

router.put("/:m_id", async (req, res) => {
  const { m_id } = req.params;
  const { m_name, release_date, director, actors, poster_url, trailer_url, description, duration_minutes, language, rating } = req.body;
  try {
    await db.promise().query(
      "UPDATE `Movie` SET m_name=?, release_date=?, director=?, actors=?, poster_url=?, trailer_url=?, description=?, duration_minutes=?, language=?, rating=? WHERE m_id=?",
      [m_name, release_date || null, director || null, actors || null, poster_url || null, trailer_url || null, description || null, duration_minutes || null, language || null, rating || null, m_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update movie" });
  }
});

router.delete("/:m_id", async (req, res) => {
  const { m_id } = req.params;
  try {
    await db.promise().query("DELETE FROM `Movie` WHERE m_id = ?", [m_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

export default router;