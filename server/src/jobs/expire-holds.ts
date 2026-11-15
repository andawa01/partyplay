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

async function runForever(): Promise<void> {
  const minutes = intervalMinutes();
  console.log(`[expire-holds] sweeping every ${minutes} minute(s)`);

  await sweepOnce();

  // A timer callback that throws would crash the process; `sweepOnce` already catches.
  setInterval(() => {
    void sweepOnce();
  }, minutes * 60_000);
}

async function main(): Promise<void> {
  await ensureClient();

  if (process.argv.includes("--once")) {
    await sweepOnce();
    await db.$disconnect();
    return;
  }

  await runForever();
}

main().catch((error) => {
  console.error("[expire-holds] fatal", error);
  process.exitCode = 1;
});
