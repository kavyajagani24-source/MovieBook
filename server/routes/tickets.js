import express from "express";
import db from "../config/db.js";
const router = express.Router();

// GET /api/tickets - fetch all tickets
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Tickets` LIMIT 100");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/create
// Insert a ticket and let the DB generate the ticket_no (auto-increment). Return created ticket_no.
router.post("/create", async (req, res) => {
  const { show_id, show_date, show_time, seat_no, hall_no, t_id, price, admin_id } = req.body;
  console.log('POST /api/tickets/create body ->', req.body);
  // Normalize seat_no: DB may expect a numeric seat id. If client sent a string like 'C10',
  // extract the numeric portion. If extraction fails, fall back to provided value.
  let seatValue = seat_no;
  if (typeof seat_no === 'string') {
    const m = seat_no.match(/(\d+)/);
    if (m) seatValue = Number(m[1]);
    else {
      // truncate long strings to 8 chars to avoid "data too long" errors
      seatValue = seat_no.slice(0, 8);
    }
  }
  try {
    const [r] = await db.promise().query(
      "INSERT INTO `Tickets` (show_id, show_date, show_time, seat_no, hall_no, t_id, price, admin_id) VALUES (?,?,?,?,?,?,?,?)",
      [show_id, show_date, show_time, seatValue, hall_no, t_id, price, admin_id]
    );
    // r.insertId should be the new ticket_no if ticket_no is auto-increment primary key
    console.log('Ticket created id ->', r.insertId);
    res.status(201).json({ ticket_no: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:ticket_no
router.get("/:ticket_no", async (req, res) => {
  const { ticket_no } = req.params;
  try {
    const [rows] = await db.promise().query("SELECT * FROM `Tickets` WHERE ticket_no = ?", [ticket_no]);
    if(!rows.length) return res.status(404).json({ error: "Ticket not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;