import db from "../config/db.js";
import ftPool from "../config/ftDb.js";
import dotenv from "dotenv";
dotenv.config();

export async function initDatabases() {
  console.log("🛠️ Initializing Distributed Systems & Fault-Tolerance Databases...");

  // 1. Ensure moviebooking_fault_tolerance database exists
  const [dbCreateRes] = await db.promise().query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.FT_DB_NAME || "moviebooking_fault_tolerance"}\`;`
  );
  console.log("✅ Fault-Tolerance Database checked/created.");

  // 2. Initialize tables in moviebooking (Main DB) for distributed metadata
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS \`distributed_booking_metadata\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`booking_id\` INT NOT NULL,
      \`node_id\` INT NOT NULL,
      \`node_role\` VARCHAR(32) NOT NULL,
      \`distributed_timestamp\` VARCHAR(64) NOT NULL,
      \`coordinator_id\` INT DEFAULT NULL,
      \`replication_status\` VARCHAR(32) DEFAULT 'PENDING',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (\`booking_id\`),
      INDEX (\`node_id\`)
    ) ENGINE=InnoDB;
  `);

  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS \`idempotency_keys\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`idempotency_key\` VARCHAR(128) NOT NULL UNIQUE,
      \`booking_id\` INT DEFAULT NULL,
      \`response_body\` TEXT DEFAULT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (\`idempotency_key\`)
    ) ENGINE=InnoDB;
  `);
  console.log("✅ Main DB distributed metadata & idempotency tables ready.");

  // 3. Initialize tables in moviebooking_fault_tolerance (FT DB)
  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS \`replicated_bookings\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`source_booking_id\` INT NOT NULL UNIQUE,
      \`customer_id\` INT NOT NULL,
      \`show_id\` INT NOT NULL,
      \`ticket_no\` INT DEFAULT NULL,
      \`seat_data\` TEXT NOT NULL,
      \`total_price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`source_node_id\` INT NOT NULL,
      \`version\` INT NOT NULL DEFAULT 1,
      \`event_type\` VARCHAR(32) NOT NULL DEFAULT 'BOOKING_CREATED',
      \`event_timestamp\` VARCHAR(64) NOT NULL,
      \`replicated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (\`source_booking_id\`),
      INDEX (\`customer_id\`),
      INDEX (\`show_id\`)
    ) ENGINE=InnoDB;
  `);

  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS \`replication_log\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`sequence_no\` INT NOT NULL DEFAULT 1,
      \`source_node_id\` INT NOT NULL,
      \`destination_node_id\` INT NOT NULL,
      \`entity_type\` VARCHAR(64) NOT NULL,
      \`entity_id\` INT NOT NULL,
      \`operation\` VARCHAR(32) NOT NULL,
      \`version\` INT NOT NULL DEFAULT 1,
      \`status\` VARCHAR(32) NOT NULL,
      \`error_message\` TEXT DEFAULT NULL,
      \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (\`sequence_no\`),
      INDEX (\`status\`)
    ) ENGINE=InnoDB;
  `);

  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS \`server_state\` (
      \`node_id\` INT PRIMARY KEY,
      \`role\` VARCHAR(32) NOT NULL,
      \`host\` VARCHAR(64) NOT NULL,
      \`port\` INT NOT NULL,
      \`status\` VARCHAR(32) NOT NULL,
      \`current_coordinator\` INT DEFAULT NULL,
      \`is_primary\` BOOLEAN DEFAULT FALSE,
      \`last_heartbeat\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`last_replication_at\` TIMESTAMP NULL DEFAULT NULL,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS \`election_log\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`algorithm\` VARCHAR(32) NOT NULL,
      \`initiator_node_id\` INT NOT NULL,
      \`elected_coordinator_id\` INT NOT NULL,
      \`messages_flow\` TEXT NOT NULL,
      \`participating_nodes\` VARCHAR(255) NOT NULL,
      \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS \`clock_sync_log\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`coordinator_id\` INT NOT NULL,
      \`participating_nodes\` TEXT NOT NULL,
      \`collected_clocks\` TEXT NOT NULL,
      \`adjustments\` TEXT NOT NULL,
      \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await ftPool.promise().query(`
    CREATE TABLE IF NOT EXISTS \`distributed_request_log\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`request_id\` VARCHAR(64) NOT NULL,
      \`client_ip\` VARCHAR(64) NOT NULL,
      \`http_method\` VARCHAR(16) NOT NULL,
      \`endpoint\` VARCHAR(255) NOT NULL,
      \`server_id\` INT NOT NULL,
      \`rpc_method\` VARCHAR(64) DEFAULT NULL,
      \`duration_ms\` INT NOT NULL,
      \`status_code\` INT NOT NULL,
      \`success\` BOOLEAN NOT NULL DEFAULT TRUE,
      \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  console.log("✅ Fault-Tolerance Database tables successfully initialized!");
}

// If executed directly from command line
if (process.argv[1]?.endsWith("initFtDb.js")) {
  initDatabases()
    .then(() => {
      console.log("🚀 All databases configured successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Initialization failed:", err);
      process.exit(1);
    });
}
