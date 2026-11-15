import "dotenv/config";

import { PrismaClient } from "@prisma/client";

/**
 * Decides once, before any test file is loaded, whether the HTTP smoke suite can run.
 *
 * `DATABASE_URL` being set is not evidence that Postgres is reachable: CI passes a
 * well-formed URL to every job, including the one with no database service. Probe it
 * instead, and let the suite skip cleanly when the connection is refused rather than
 * failing the whole run.
 */
export default async function setup(): Promise<void> {
  process.env.PARTYPLAY_SMOKE_DB = "skip";
  if (!process.env.DATABASE_URL) {
    return;
  }

  const probe = new PrismaClient({ log: [] });
  try {
    await probe.$queryRaw`SELECT 1`;
    process.env.PARTYPLAY_SMOKE_DB = "run";
  } catch (error) {
    // Keep the skip decision, but say why so an unreachable database in a job that was
    // supposed to have one is visible instead of silently reducing coverage.
    const detail = (error instanceof Error ? error.message : String(error))
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);
    console.warn(
      `[tests] database unreachable, skipping HTTP smoke tests: ${detail ?? "unknown error"}`,
    );
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
}
