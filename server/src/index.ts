import "dotenv/config";

import type { Server } from "node:http";

import { createApp } from "./app";
import { db, ensureClient } from "./config/db";

const PORT = Number(process.env.PORT ?? 4000);
const configuredShutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000);
const SHUTDOWN_TIMEOUT_MS =
  Number.isFinite(configuredShutdownTimeout) && configuredShutdownTimeout > 0
    ? configuredShutdownTimeout
    : 10_000;

let server: Server | undefined;
let shuttingDown = false;

/**
 * Stop accepting new work, let in-flight responses finish, then close the Prisma pool.
 * The timer is the backstop for a stuck request or connection; without it a deploy can
 * hang forever instead of being replaced.
 */
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received, draining connections`);

  const forceExit = setTimeout(() => {
    console.error(`[shutdown] timed out after ${SHUTDOWN_TIMEOUT_MS}ms`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await db.$disconnect();
    clearTimeout(forceExit);
    console.log("[shutdown] complete");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExit);
    console.error("[shutdown] failed", error);
    process.exit(1);
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

// Ensure the database is connected before we start listening for traffic.
ensureClient()
  .then(() => {
    server = createApp().listen(PORT, () => {
      console.log(`PartyPlay API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
