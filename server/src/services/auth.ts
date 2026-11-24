import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { Prisma, Role } from "@prisma/client";
import bcrypt from "bcrypt";

import { db } from "../config/db";
import { ApiError, badRequest, unauthorized } from "../lib/api-error";
import { signSessionToken } from "../lib/tokens";
import type { ChangePasswordInput, LoginInput, ResetPasswordInput } from "../schemas/auth";

export const PASSWORD_COST = 12;
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface AdminSummary {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface AdminSession extends AdminSummary {
  sessionVersion: number;
}

const adminSummaryFields = {
  id: true,
  email: true,
  name: true,
  role: true,
} satisfies Prisma.AdminSelect;

/**
 * Compared against when the email is unknown, so a failed login costs the same bcrypt
 * work either way and response time does not reveal which emails exist. Built lazily
 * because generating it costs one hash at startup and is never needed otherwise.
 */
let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomUUID(), PASSWORD_COST);
  return dummyHash;
}

export async function login(input: LoginInput): Promise<{ admin: AdminSummary; token: string }> {
  const admin = await db.admin.findUnique({
    where: { email: input.email },
    select: { ...adminSummaryFields, password: true, sessionVersion: true },
  });

  if (!admin) {
    await bcrypt.compare(input.password, await getDummyHash());
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, admin.password);
  if (!passwordMatches) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const { password: _password, sessionVersion, ...summary } = admin;
  return {
    admin: summary,
    token: signSessionToken(admin.id, sessionVersion),
  };
}

/** Resolves the admin behind a session token; null means the row is gone. */
export async function findAdminForSession(adminId: string): Promise<AdminSession | null> {
  return db.admin.findUnique({
    where: { id: adminId },
    select: { ...adminSummaryFields, sessionVersion: true },
  });
}

export async function changePassword(adminId: string, input: ChangePasswordInput): Promise<void> {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { password: true },
  });

  if (!admin) {
    throw unauthorized("Your session is no longer valid. Sign in again.");
  }

  const currentMatches = await bcrypt.compare(input.currentPassword, admin.password);
  if (!currentMatches) {
    throw badRequest("Current password is incorrect");
  }

  const password = await bcrypt.hash(input.newPassword, PASSWORD_COST);
  await db.admin.update({ where: { id: adminId }, data: { password } });
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a one-time reset link token. Only the hash is stored, and issuing a new token
 * cancels any previous unused link for the same admin.
 */
export async function issuePasswordResetToken(
  adminId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

  await db.$transaction([
    db.passwordResetToken.updateMany({
      where: { adminId, usedAt: null },
      data: { usedAt: now },
    }),
    db.passwordResetToken.create({
      data: { adminId, tokenHash: hashResetToken(token), expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

/**
 * Consumes a reset token and changes the password in one transaction. The conditional
 * `updateMany` means two concurrent submissions cannot both reset the account.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const now = new Date();
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(input.token) },
    select: { id: true, adminId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt <= now) {
    throw badRequest("This reset link is invalid or has expired. Request a new one.");
  }

  // Hash before opening the transaction so bcrypt does not hold a database lock.
  const password = await bcrypt.hash(input.newPassword, PASSWORD_COST);

  await db.$transaction(async (tx) => {
    const consumedAt = new Date();
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: consumedAt } },
      data: { usedAt: consumedAt },
    });
    if (consumed.count !== 1) {
      throw badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    // Any other outstanding link for this admin is now useless too.
    await tx.passwordResetToken.updateMany({
      where: { adminId: record.adminId, usedAt: null },
      data: { usedAt: consumedAt },
    });

    await tx.admin.update({
      where: { id: record.adminId },
      data: { password, sessionVersion: { increment: 1 } },
    });
  });
}
