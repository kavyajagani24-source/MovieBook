import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Dedicated connection pool for the fault-tolerance database
const ftPool = mysql.createPool({
  host: process.env.FT_DB_HOST || process.env.DB_HOST || "localhost",
  user: process.env.FT_DB_USER || process.env.DB_USER || "root",
  password: process.env.FT_DB_PASSWORD !== undefined ? process.env.FT_DB_PASSWORD : (process.env.DB_PASSWORD || ""),
  database: process.env.FT_DB_NAME || "moviebooking_fault_tolerance",
  port: process.env.FT_DB_PORT ? Number(process.env.FT_DB_PORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default ftPool;
