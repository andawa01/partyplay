import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";

import { db } from "./config/db";
import { errorHandler, notFoundHandler, requestId } from "./middleware/error";
import { requestLogger } from "./middleware/request-logger";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import availabilityRouter from "./routes/availability";
import bookingsRouter from "./routes/bookings";
import calendarRouter from "./routes/calendar";
import categoriesRouter from "./routes/categories";
import equipmentRouter from "./routes/equipment";
import offersRouter from "./routes/offers";
import packagesRouter from "./routes/packages";
import siteRouter from "./routes/site";

/**
 * Builds the Express app without starting a listener, so tests can drive the real
 * middleware and routes on an ephemeral port. `index.ts` owns connecting and listening.
 */
export function createApp(): Express {
  const app = express();

  // Behind Caddy the socket is the proxy, so limiter keys and logs would all read as one
  // address unless Express is told how many hops to trust. Direct dev traffic stays as is.
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (Number.isInteger(proxyHops) && proxyHops > 0) {
    app.set("trust proxy", proxyHops);
  }

  app.use(requestId);
  app.use(requestLogger);
  // `credentials` lets the client send the session cookie when it calls the API on a
  // different origin (it is same-origin behind the Vite proxy and Caddy in production).
  app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173", credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  // Keeps the original contract: the compose health check depends on this shape.
  app.get("/api/health", async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      return res
        .status(503)
        .json({ status: "error", service: "partyplay-api", error: "database unavailable" });
    }
    res.json({ status: "ok", service: "partyplay-api" });
  });

  app.use("/api/admin", adminRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/equipment", equipmentRouter);
  app.use("/api/availability", availabilityRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/packages", packagesRouter);
  app.use("/api/offers", offersRouter);
  app.use("/api/site", siteRouter);

  // Anything under /api that reached this point matched no route.
  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}
