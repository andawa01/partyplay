import { randomUUID } from "node:crypto";

import type { Prisma, Role } from "@prisma/client";
import bcrypt from "bcrypt";

import { db } from "../config/db";
import { ApiError, badRequest, unauthorized } from "../lib/api-error";
import { signSessionToken } from "../lib/tokens";
import type { ChangePasswordInput, LoginInput } from "../schemas/auth";

export const PASSWORD_COST = 12;

export interface AdminSummary {
  id: string;
  email: string;
  name: string | null;
  role: Role;
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
    select: { ...adminSummaryFields, password: true },
  });

  if (!admin) {
    await bcrypt.compare(input.password, await getDummyHash());
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, admin.password);
  if (!passwordMatches) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const { password: _password, ...summary } = admin;
  return { admin: summary, token: signSessionToken(admin.id) };
}

/** Resolves the admin behind a session token; null means the row is gone. */
export async function findAdminForSession(adminId: string): Promise<AdminSummary | null> {
  return db.admin.findUnique({ where: { id: adminId }, select: adminSummaryFields });
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
