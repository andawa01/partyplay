import "dotenv/config";
import bcrypt from "bcrypt";

import { db, ensureClient } from "../config/db";
import { passwordSchema } from "../schemas/auth";
import { PASSWORD_COST } from "../services/auth";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "PartyPlay Owner";

  if (!email) {
    fail("Set ADMIN_EMAIL in server/.env before running this script.");
  }
  const passwordCheck = passwordSchema.safeParse(password ?? "");
  if (!passwordCheck.success) {
    fail(
      `Set ADMIN_PASSWORD in server/.env. ${passwordCheck.error.issues[0]?.message ?? "Choose a stronger password."}`,
    );
  }

  await ensureClient();

  // Idempotent on purpose: rerunning never overwrites an existing password. Change it
  // through POST /api/auth/password once you are signed in.
  const existing = await db.admin.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Admin ${email} already exists. Password left unchanged.`);
    return;
  }

  const admin = await db.admin.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(passwordCheck.data, PASSWORD_COST),
      role: "OWNER",
    },
    select: { email: true, role: true },
  });

  console.log(`Created ${admin.role} admin ${admin.email}. Sign in at POST /api/auth/login.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
