import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "..");

const nodes = [
  { id: 1, role: "SERVER", port: 5000, offset: 5000 },
  { id: 2, role: "SERVER", port: 5001, offset: -3000 },
  { id: 3, role: "SERVER", port: 5002, offset: 8000 },
  { id: 4, role: "BACKUP", port: 5003, offset: 0 }
];

console.log("🚀 Launching all 4 MovieBook Distributed Cluster Nodes...");

nodes.forEach((node) => {
  const child = spawn("node", ["index.js"], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(node.port),
      NODE_ID: String(node.id),
      NODE_ROLE: node.role,
      CLOCK_OFFSET_MS: String(node.offset),
      NODE1_URL: "http://localhost:5000",
      NODE2_URL: "http://localhost:5001",
      NODE3_URL: "http://localhost:5002",
      BACKUP_URL: "http://localhost:5003",
      FT_DB_NAME: "moviebooking_fault_tolerance"
    },
    stdio: "inherit"
  });

  child.on("error", (err) => {
    console.error(`[Node ${node.id} - ${node.role}] Process error:`, err);
  });
});
