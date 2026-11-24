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
  const required = process.env.PARTYPLAY_REQUIRE_SMOKE_DB === "1";
  process.env.PARTYPLAY_SMOKE_DB = "skip";

  if (!process.env.DATABASE_URL) {
    if (required) {
      throw new Error("[tests] PARTYPLAY_REQUIRE_SMOKE_DB=1 but DATABASE_URL is not set");
    }
    return;
  }

  const probe = new PrismaClient({ log: [] });
  try {
    await probe.$queryRaw`SELECT 1`;
    process.env.PARTYPLAY_SMOKE_DB = "run";
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error))
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    // In the CI job that owns Postgres, a skipped suite is a failed job. Otherwise keep
    // the local workflow: an unreachable database skips only the HTTP tests.
    if (required) {
      throw new Error(
        `[tests] database unreachable while smoke tests are required: ${detail ?? "unknown error"}`,
      );
    }
    console.warn(
      `[tests] database unreachable, skipping HTTP smoke tests: ${detail ?? "unknown error"}`,
    );
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
}
