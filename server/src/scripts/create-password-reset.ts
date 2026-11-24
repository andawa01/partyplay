import "dotenv/config";

import { db, ensureClient } from "../config/db";
import { issuePasswordResetToken } from "../services/auth";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
  if (!email) {
    fail("Usage: npm run admin:reset-link -- owner@example.com");
  }

  await ensureClient();

  const admin = await db.admin.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!admin) {
    fail(`No admin account found for ${email}.`);
  }

  const { token, expiresAt } = await issuePasswordResetToken(admin.id);
  const baseUrl = (
    process.env.APP_BASE_URL ??
    process.env.CLIENT_URL ??
    "http://localhost:5173"
  ).replace(/\/+$/, "");
  const resetUrl = `${baseUrl}/admin/reset-password#token=${encodeURIComponent(token)}`;

  console.log(`Password reset link for ${admin.email}:`);
  console.log(resetUrl);
  console.log(`Expires at ${expiresAt.toISOString()} and can be used once.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
