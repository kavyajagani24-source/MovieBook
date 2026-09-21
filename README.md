# 🎬 MovieBook — Distributed Cinema Booking System

MovieBook is a full-stack cinema booking application enhanced into a **4-node Distributed System** featuring active-active request routing, transaction concurrency control, Berkeley clock synchronization, election algorithms (Bully & Ring), and primary-backup replication to a separate fault-tolerance database.

---

## 🏗️ 1. Distributed System Architecture

```plaintext
                              ┌─────────────────────────┐
                              │  React 18 SPA Frontend   │
                              │   (Vite @ Port 8080)    │
                              └────────────┬────────────┘
                                           │
                                  Distributed Router
                      (Auto-Detects Healthy Node & Idempotency)
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
     ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
     │ Application Node 1│         │ Application Node 2│         │ Application Node 3│
     │    (Port 5000)   │         │    (Port 5001)   │         │    (Port 5002)   │
     │ Offset: +5000ms  │         │ Offset: -3000ms  │         │ Offset: +8000ms  │
     └────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
              │                            │                            │
              └────────────────────────────┼────────────────────────────┘
                                           ▼
                           ┌───────────────────────────────┐
                           │    Main MySQL Database        │
                           │       `moviebooking`          │
                           │  • Tickets, Bookings, Shows   │
                           │  • distributed_booking_metadata│
                           │  • idempotency_keys           │
                           └───────────────┬───────────────┘
                                           │
                                  Replication Layer
                               (HTTP RPC & Asynchronous)
                                           │
                                           ▼
                           ┌───────────────────────────────┐
                           │   Dedicated Backup Server     │
                           │     Node 4 (Port 5003)        │
                           │   Standby / Promotable Primary│
                           └───────────────┬───────────────┘
                                           │
                                           ▼
                           ┌───────────────────────────────┐
                           │   Fault-Tolerance Database    │
                           │ `moviebooking_fault_tolerance`│
                           │  • replicated_bookings        │
                           │  • replication_log            │
                           │  • election_log               │
                           │  • clock_sync_log             │
                           │  • distributed_request_log    │
                           └───────────────────────────────┘
```

---

## 🚀 2. Quick Start Guide

### Step 1: Database Initialization
Ensure MySQL is running on `localhost:3306`. Initialize both databases and tables:
```bash
cd server
npm run init:ft-db
```

### Step 2: Start All 4 Backend Cluster Nodes
You can launch all 4 server nodes concurrently in a single command:
```bash
cd server
npm run cluster:start
```
*Or start them in separate terminals:*
- **Server 1**: `npm run server:1` *(Port 5000, ID: 1, Offset: +5000ms)*
- **Server 2**: `npm run server:2` *(Port 5001, ID: 2, Offset: -3000ms)*
- **Server 3**: `npm run server:3` *(Port 5002, ID: 3, Offset: +8000ms)*
- **Backup Server**: `npm run server:backup` *(Port 5003, ID: 4, Offset: 0ms)*

### Step 3: Start the Frontend
In the root directory:
```bash
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 🎛️ 3. Distributed Systems Admin Dashboard
- **URL**: `http://localhost:8080/admin/distributed`
- **Admin Login**: Admin ID: `1`, Password: `adminpass1`
- Provides real-time interactive panels for:
  - **Node Registry**: Live statuses, ports, clocks, offsets, roles, coordinators.
  - **Experiment 1 (Client-Server / RPC)**: Dispatch remote procedure calls (`getMovie`, `checkSeatAvailability`, `calculateBookingTotal`) with latency tracking.
  - **Experiment 2 (Concurrency / Multithreading)**: Stress-test simultaneous bookings for the same seat/show to verify transaction isolation and double-booking prevention.
  - **Experiment 3 (Berkeley Clock Synchronization)**: Poll clocks across nodes, compute mathematical mean adjustment, and synchronize cluster clocks.
  - **Experiment 4 (Leader Elections)**: Trigger Bully Election or Ring Election and watch the live message flow and winner announcement.
  - **Experiment 5 (Fault Tolerance & Replication)**: Live records from `moviebooking_fault_tolerance`, simulated server failure, and 1-click Backup promotion to Primary.
  - **Admin Node Probe**: Explicitly target Server 1, 2, or 3 to prove all active nodes execute bookings and replicate state.

---

## 🔬 4. The 5 Distributed Systems Experiments Explained

### **Experiment 1: Client-Server / RPC Communication**
- **Architecture**: React frontend acts as the client invoking remote Express procedure calls.
- **Endpoint**: `POST /api/distributed/rpc`
- **Payload**:
  ```json
  { "method": "getMovie", "params": { "movieId": 1 } }
  ```
- **Response**: Returns procedure output, responding `serverId`, timestamp, and execution duration in milliseconds.

### **Experiment 2: Multithreading & Concurrent Bookings**
- **Problem**: In high-demand cinema releases, multiple customers attempt to book the exact same seat simultaneously.
- **Solution**: The backend executes within an atomic SQL Transaction utilizing **pessimistic locking** (`SELECT ticket_no FROM Tickets WHERE show_id = ? AND seat_no = ? FOR UPDATE`).
- **Endpoint**: `POST /api/distributed/concurrency-test`
- **Demonstration**: Launching 10 parallel requests yields **exactly 1 SUCCESS** and **9 SEAT_ALREADY_OCCUPIED rejections**.

### **Experiment 3: Berkeley Clock Synchronization**
- **Algorithm**:
  1. A Coordinator node polls all participating application servers (Node 1, 2, 3) for their distributed clocks.
  2. Coordinator computes relative differences: `diff_i = time_i - referenceTime`.
  3. Computes average adjustment: `avgDiff = sum(diff_i) / N`.
  4. Dispatches adjustment deltas: `adjustment_i = avgDiff - diff_i`.
  5. Each node adjusts its local offset so clocks mathematically converge.
- **Endpoint**: `POST /api/distributed/berkeley/sync`

### **Experiment 4: Election Algorithms (Bully & Ring)**
- **Bully Election**:
  - Initiating node sends `ELECTION` to all higher-ID nodes.
  - If higher nodes respond, the highest active ID wins. If none respond, initiator wins.
  - Victor broadcasts `COORDINATOR` victory announcement to all lower peers.
  - **Endpoint**: `POST /api/distributed/election/bully`
- **Ring Election**:
  - Nodes form logical ring `1 -> 2 -> 3 -> 1`.
  - An election token containing active node IDs circulates the ring.
  - When the token returns to the initiator, the node with `MAX(token)` is elected coordinator.
  - **Endpoint**: `POST /api/distributed/election/ring`

### **Experiment 5: Fault Tolerance & Primary-Backup Replication**
- **Architecture**:
  - Every committed booking on an Application Server (Node 1, 2, 3) writes to `moviebooking` and asynchronously replicates to Backup Server (Node 4) and the separate database `moviebooking_fault_tolerance`.
  - If a primary server fails, the frontend distributed router automatically routes subsequent booking requests to another healthy server or the promoted backup server.
  - Supports idempotency keys (`X-Booking-Request-ID`) to prevent duplicate bookings during network retries.
- **Endpoints**:
  - `GET /api/distributed/replication/status`
  - `POST /api/distributed/simulate-failure`
  - `POST /api/distributed/promote-backup`

---

## 🎓 5. Viva / Oral Exam Quick Reference

| Concept | Explanation for Examiners |
| :--- | :--- |
| **RPC** | "React acts as client; Express servers act as remote services. Invocations execute real backend functions with latency and server ID stamps." |
| **Concurrency** | "Protects shared resources (seats). MySQL transactions with `FOR UPDATE` pessimistic locking serialize conflicting requests atomically." |
| **Berkeley Algorithm** | "Coordinator polls distributed clocks from active nodes, computes the mean relative difference, and informs each node of its calculated delta." |
| **Bully Election** | "Nodes with higher IDs take precedence. Any node detecting failure can initiate; the highest surviving ID wins." |
| **Ring Election** | "A message token accumulates active IDs in a logical ring topology. When returned to the initiator, the maximum ID is declared coordinator." |
| **Primary-Backup** | "Active nodes process client writes and replicate state to a dedicated backup server and a separate fault-tolerance database (`moviebooking_fault_tolerance`)." |
