import "dotenv/config";

import { db, ensureClient } from "../config/db";
import { expireOverdueBookings } from "../services/hold-expiry";

/**
 * The sweeper (F7). Expiry is also applied lazily when a customer opens availability or
 * their booking, so this job is about keeping the table honest even when nobody looks —
 * not about being the only defence.
 *
 * Run once:  npm run job:expire-holds
 * Run always: npm run job:expire-holds:watch
 */
const DEFAULT_INTERVAL_MINUTES = 5;

let timer: NodeJS.Timeout | undefined;
let inFlight: Promise<void> | undefined;

function intervalMinutes(): number {
  const configured = Number(process.env.HOLD_SWEEP_INTERVAL_MINUTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INTERVAL_MINUTES;
}

/** One pass, logged. Never throws for the caller to have to guard. */
export async function sweepOnce(): Promise<number> {
  try {
    const expired = await expireOverdueBookings();
    console.log(`[expire-holds] ${new Date().toISOString()} expired ${expired} overdue booking(s)`);
    return expired;
  } catch (error) {
    console.error("[expire-holds] sweep failed", error);
    return 0;
  }
}

async function scheduledSweep(): Promise<void> {
  if (inFlight) {
    console.warn("[expire-holds] previous sweep still running; skipping this pass");
    return;
  }

  inFlight = sweepOnce().then(() => undefined);
  try {
    await inFlight;
  } finally {
    inFlight = undefined;
  }
}

async function runForever(): Promise<void> {
  const minutes = intervalMinutes();
  console.log(`[expire-holds] sweeping every ${minutes} minute(s)`);

  await scheduledSweep();

  // A timer callback that throws would crash the process; the guards above keep it safe.
  timer = setInterval(() => {
    void scheduledSweep();
  }, minutes * 60_000);
}

async function stop(signal: NodeJS.Signals): Promise<void> {
  console.log(`[expire-holds] ${signal} received, stopping`);
  if (timer) {
    clearInterval(timer);
  }
  await inFlight;
  await db.$disconnect();
  process.exit(0);
}

async function main(): Promise<void> {
  await ensureClient();

  if (process.argv.includes("--once")) {
    await sweepOnce();
    await db.$disconnect();
    return;
  }

  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));
  await runForever();
}

main().catch((error) => {
  console.error("[expire-holds] fatal", error);
  process.exitCode = 1;
});
