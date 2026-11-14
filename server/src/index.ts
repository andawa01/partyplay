import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { db, ensureClient } from "./config/db";
import { errorHandler, notFoundHandler, requestId } from "./middleware/error";
import authRouter from "./routes/auth";
import categoriesRouter from "./routes/categories";
import equipmentRouter from "./routes/equipment";
import offersRouter from "./routes/offers";
import packagesRouter from "./routes/packages";
import siteRouter from "./routes/site";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(requestId);
// `credentials` lets the client send the session cookie when it calls the API on a
// different origin (it is same-origin behind the Vite proxy and Caddy in production).
app.use(
  cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173", credentials: true }),
);
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

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/equipment", equipmentRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/offers", offersRouter);
app.use("/api/site", siteRouter);

// Anything under /api that reached this point matched no route.
app.use("/api", notFoundHandler);
app.use(errorHandler);

// Ensure the database is connected before we start listening for traffic.
ensureClient()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PartyPlay API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
