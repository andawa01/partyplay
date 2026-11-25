import type { Prisma, Role } from "@prisma/client";
import bcrypt from "bcrypt";

import { db } from "../config/db";
import { badRequest, conflict, notFound } from "../lib/api-error";
import { PASSWORD_COST } from "./auth";
import type { CreateStaffInput, SetStaffPasswordInput, UpdateStaffInput } from "../schemas/staff";

export interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdminSelect;

export async function listStaff(): Promise<StaffMember[]> {
  return db.admin.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: staffFields,
  });
}

export async function createStaff(input: CreateStaffInput): Promise<StaffMember> {
  const existing = await db.admin.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw conflict("An account with that email already exists");
  }

  const password = await bcrypt.hash(input.password, PASSWORD_COST);
  return db.admin.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      password,
    },
    select: staffFields,
  });
}

/**
 * Changes a role or disables an account. The last active owner can never be demoted or
 * disabled, and nobody can demote or disable their own account — that would otherwise
 * lock the business out of its only administrative login.
 */
export async function updateStaff(
  actorId: string,
  targetId: string,
  input: UpdateStaffInput,
): Promise<StaffMember> {
  return db.$transaction(
    async (tx) => {
      const target = await tx.admin.findUnique({
        where: { id: targetId },
        select: { id: true, role: true, isActive: true },
      });
      if (!target) {
        throw notFound("That account does not exist");
      }

      const role = input.role;
      const isActive = input.isActive;

      if (targetId === actorId && role !== undefined && role !== target.role) {
        throw badRequest("You cannot change your own role");
      }
      if (targetId === actorId && isActive === false) {
        throw badRequest("You cannot disable your own account");
      }

      const demotingOwner = target.role === "OWNER" && role !== undefined && role !== "OWNER";
      const disablingOwner = target.role === "OWNER" && isActive === false;
      if (demotingOwner || disablingOwner) {
        const otherOwners = await tx.admin.count({
          where: {
            id: { not: targetId },
            role: "OWNER",
            isActive: true,
          },
        });
        if (otherOwners === 0) {
          throw conflict("The last active owner cannot be demoted or disabled");
        }
      }

      return tx.admin.update({
        where: { id: targetId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          // A disabled account must lose every existing session immediately.
          ...(isActive === false ? { sessionVersion: { increment: 1 } } : {}),
        },
        select: staffFields,
      });
    },
    { isolationLevel: "Serializable" },
  );
}

/**
 * Sets a new password for another account and revokes its sessions. Owners use this to
 * issue a temporary password; the holder changes it from Settings after signing in.
 */
export async function setStaffPassword(
  actorId: string,
  targetId: string,
  input: SetStaffPasswordInput,
): Promise<void> {
  if (actorId === targetId) {
    throw badRequest("Use Settings to change your own password");
  }

  const password = await bcrypt.hash(input.password, PASSWORD_COST);
  const updated = await db.admin.updateMany({
    where: { id: targetId },
    data: { password, sessionVersion: { increment: 1 } },
  });
  if (updated.count === 0) {
    throw notFound("That account does not exist");
  }
}
