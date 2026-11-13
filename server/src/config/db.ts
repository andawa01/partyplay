import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

async function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Verify the database is reachable before the app starts serving traffic.
  // This is a lightweight probe; it does not run any Prisma migrations.
  try {
    await client.$queryRaw`SELECT 1`;
    console.log("database connected successfully");
  } catch (error) {
    console.error("database connection failed:", error);
    throw new Error("PartyPlay API could not connect to the database. Check DATABASE_URL and that PostgreSQL is running.");
  }

  return client;
}

let connected = false;

async function ensureClient() {
  if (!connected) {
    if (process.env.NODE_ENV === "production") {
      db = await createClient();
    } else {
      if (!global.__db__) {
        global.__db__ = await createClient();
      }
      db = global.__db__;
    }
    connected = true;
  }
}

export { db, ensureClient };

// If something imports `db` before we have a chance to connect, fail fast.
// The app's entry point will call `ensureClient()` and await it before listening.
