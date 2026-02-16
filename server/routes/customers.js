import express from "express";
import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// POST /api/customers/signup
router.post("/signup", async (req, res) => {
  const { c_name, email_id, phone_no, password, dob } = req.body;
  try {
    const [existing] = await db.promise().query("SELECT * FROM `Customer` WHERE email_id = ? OR phone_no = ?", [email_id, phone_no]);
    if (existing.length) return res.status(400).json({ error: "User exists" });
    const hashed = await bcrypt.hash(password, 10);
    const [r] = await db.promise().query("INSERT INTO `Customer` (c_name, email_id, phone_no, password, dob) VALUES (?,?,?,?,?)", [c_name, email_id, phone_no, hashed, dob || null]);
    const c_id = r.insertId;
    const token = jwt.sign({ c_id, email_id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ c_id, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/login
router.post("/login", async (req, res) => {
  const { email_id, password } = req.body;
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Customer` WHERE email_id = ?", [email_id]);
    if (!rows.length) return res.status(400).json({ error: "Invalid credentials" });
    const user = rows[0];
    
    // Support both hashed passwords (new users) and plain-text passwords (legacy dummy data)
    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch (err) {
      // If bcrypt.compare fails (e.g., password is not a valid hash), try direct comparison
      valid = password === user.password;
    }
    
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ c_id: user.c_id, email_id: user.email_id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ c_id: user.c_id, c_name: user.c_name, email_id: user.email_id, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/all (list all customers - admin) - MUST come before /:c_id
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT c_id, c_name, email_id, phone_no, dob FROM `Customer` ORDER BY c_id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:c_id
router.get("/:c_id", async (req, res) => {
  const { c_id } = req.params;
  const [rows] = await db.promise().query("SELECT c_id,c_name,email_id,phone_no,dob FROM `Customer` WHERE c_id = ?", [c_id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// DELETE /api/customers/:c_id (delete a customer - admin)
router.delete("/:c_id", async (req, res) => {
  const { c_id } = req.params;
  try {
    const [result] = await db.promise().query("DELETE FROM `Customer` WHERE c_id = ?", [c_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;