import express from "express";
import cors from "cors";
import "dotenv/config";

import { db, ensureClient } from "./config/db";
import { errorHandler, notFoundHandler, requestId } from "./middleware/error";
import categoriesRouter from "./routes/categories";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(requestId);
app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173" }));
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

app.use("/api/categories", categoriesRouter);

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
