import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/discounts
router.get("/", async (req, res) => {
  const [rows] = await db.promise().query("SELECT * FROM `Discount`");
  res.json(rows);
});

// POST /api/discounts
router.post("/", async (req, res) => {
  const { m_name, price } = req.body;
  const [r] = await db.promise().query("INSERT INTO `Discount` (m_name, price) VALUES (?,?)", [m_name, price]);
  res.status(201).json({ offer_id: r.insertId });
});

export default router;