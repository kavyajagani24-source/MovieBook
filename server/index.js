import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import moviesRouter from "./routes/movies.js";
import showsRouter from "./routes/shows.js";
import ticketsRouter from "./routes/tickets.js";
import bookingsRouter from "./routes/bookings.js";
import healthRouter from "./routes/health.js";
import customersRouter from "./routes/customers.js";
import adminRouter from "./routes/admin.js";
import theatresRouter from "./routes/theatres.js";
import seatsRouter from "./routes/seats.js";
import discountsRouter from "./routes/discounts.js";
import debugRouter from "./routes/debug.js";
import checkoutRouter from "./routes/checkout.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Serve poster/static assets if placed under server/posters or ../public/posters
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPosters = path.join(__dirname, "posters");
const projectPublicPosters = path.join(__dirname, "..", "public", "posters");
// serve server/posters at /posters if exists
app.use('/posters', express.static(serverPosters));
// also serve project public/posters so images placed in repo-level public/posters are available
app.use('/posters', express.static(projectPublicPosters));

app.use("/api/movies", moviesRouter);
app.use("/api/shows", showsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/bookings", bookingsRouter);
app.use('/api/health', healthRouter);
app.use("/api/customers", customersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/theatres", theatresRouter);
app.use("/api/seats", seatsRouter);
app.use("/api/discounts", discountsRouter);
app.use('/api/debug', debugRouter);
app.use('/api/checkout', checkoutRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});