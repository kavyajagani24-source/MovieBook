import db from "../config/db.js";
import { NODE_ID, getLocalClock } from "./nodeRegistry.js";
import { logDistributedRequest } from "./requestLogger.js";

/**
 * Executes real server-side procedures triggered remotely.
 */
export async function executeRpcMethod(method, params = {}, clientIp = "127.0.0.1") {
  const startTime = Date.now();
  let success = true;
  let result = null;
  let errorMsg = null;

  try {
    switch (method) {
      case "getMovie": {
        const movieId = params.movieId || params.m_id || 1;
        const [rows] = await db.promise().query("SELECT * FROM `Movie` WHERE m_id = ?", [movieId]);
        if (!rows.length) throw new Error(`Movie with ID ${movieId} not found`);
        result = rows[0];
        break;
      }

      case "getMovieShows": {
        const movieId = params.movieId || params.m_id || 1;
        const [rows] = await db.promise().query(
          "SELECT s.*, th.t_name, th.location FROM `Shows` s JOIN `Theatre` th ON s.t_id = th.t_id WHERE s.m_id = ?",
          [movieId]
        );
        result = rows;
        break;
      }

      case "checkSeatAvailability": {
        const showId = params.showId || 1;
        const seatNo = params.seatNo || params.seat || "C1";
        // Check if ticket exists with this seat for this show
        const [rows] = await db.promise().query(
          "SELECT * FROM `Tickets` WHERE show_id = ? AND (seat_no = ? OR seat_no = ?)",
          [showId, seatNo, seatNo.replace(/\D/g, "")]
        );
        result = {
          showId,
          seatNo,
          isAvailable: rows.length === 0,
          ticketCount: rows.length
        };
        break;
      }

      case "calculateBookingTotal": {
        const seatCount = Number(params.seatCount || 1);
        const basePrice = Number(params.basePrice || 250);
        const discountPercentage = Number(params.discountPercentage || 0);
        const subtotal = seatCount * basePrice;
        const discountAmount = (subtotal * discountPercentage) / 100;
        const total = subtotal - discountAmount;
        result = {
          seatCount,
          basePrice,
          subtotal,
          discountAmount,
          finalTotal: total
        };
        break;
      }

      case "getClusterDiagnostics": {
        const [movieCount] = await db.promise().query("SELECT COUNT(*) AS count FROM `Movie`");
        const [bookingCount] = await db.promise().query("SELECT COUNT(*) AS count FROM `Booking`");
        const [ticketCount] = await db.promise().query("SELECT COUNT(*) AS count FROM `Tickets`");
        result = {
          activeMovies: movieCount[0].count,
          totalBookings: bookingCount[0].count,
          totalTicketsIssued: ticketCount[0].count,
          systemStatus: "OPTIMAL"
        };
        break;
      }

      default:
        throw new Error(`Unknown RPC method: '${method}'`);
    }
  } catch (err) {
    success = false;
    errorMsg = err.message;
  }

  const durationMs = Date.now() - startTime;
  const clock = getLocalClock();

  // Log this RPC execution
  await logDistributedRequest({
    requestId: `rpc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    clientIp,
    httpMethod: "RPC",
    endpoint: `/rpc/${method}`,
    serverId: NODE_ID,
    rpcMethod: method,
    durationMs,
    statusCode: success ? 200 : 400,
    success
  });

  if (!success) {
    return {
      success: false,
      error: errorMsg,
      serverId: NODE_ID,
      timestamp: clock.isoString,
      responseTime: durationMs
    };
  }

  return {
    success: true,
    result,
    serverId: NODE_ID,
    timestamp: clock.isoString,
    responseTime: durationMs
  };
}
