import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, conflict, notFound } from "../lib/api-error";
import { formatCalendarDate, parseCalendarDate } from "../lib/dates";
import type { CreateBlackoutInput } from "../schemas/blackouts";

/**
 * Date-specific downtime. A blackout removes every unit of one equipment item from the
 * pool for the inclusive range while leaving the item visible and bookable on other dates.
 */
export type BlackoutClient = Prisma.TransactionClient | PrismaClient;

export type BlackoutRangeRow = {
  id: string;
  equipmentId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
};

const blackoutRangeFields = {
  id: true,
  equipmentId: true,
  startDate: true,
  endDate: true,
  reason: true,
} satisfies Prisma.EquipmentBlackoutSelect;

const adminBlackoutFields = {
  ...blackoutRangeFields,
  createdAt: true,
  updatedAt: true,
  equipment: { select: { id: true, name: true, slug: true, isActive: true } },
} satisfies Prisma.EquipmentBlackoutSelect;

type AdminBlackoutRow = Prisma.EquipmentBlackoutGetPayload<{ select: typeof adminBlackoutFields }>;

/** Blackouts that overlap the requested inclusive range. */
export async function getBlackoutsForRange(input: {
  equipmentIds: string[];
  startDate: Date;
  endDate: Date;
  client?: BlackoutClient;
}): Promise<BlackoutRangeRow[]> {
  if (input.equipmentIds.length === 0) {
    return [];
  }

  const client = input.client ?? db;
  return client.equipmentBlackout.findMany({
    where: {
      equipmentId: { in: input.equipmentIds },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
    select: blackoutRangeFields,
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });
}

/** One representative blackout per equipment, for availability rows and error details. */
export function blackoutByEquipment(rows: BlackoutRangeRow[]): Map<string, BlackoutRangeRow> {
  const map = new Map<string, BlackoutRangeRow>();
  for (const row of rows) {
    if (!map.has(row.equipmentId)) {
      map.set(row.equipmentId, row);
    }
  }
  return map;
}

export function serializeBlackout(row: BlackoutRangeRow) {
  return {
    id: row.id,
    equipmentId: row.equipmentId,
    startDate: formatCalendarDate(row.startDate),
    endDate: formatCalendarDate(row.endDate),
    reason: row.reason,
  };
}

function toAdminBlackout(row: AdminBlackoutRow) {
  return {
    ...serializeBlackout(row),
    equipment: row.equipment,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBlackouts() {
  const rows = await db.equipmentBlackout.findMany({
    select: adminBlackoutFields,
    orderBy: [{ startDate: "asc" }, { equipment: { name: "asc" } }],
  });

  return rows.map(toAdminBlackout);
}

export async function createBlackout(input: CreateBlackoutInput) {
  const startDate = parseCalendarDate(input.startDate);
  const endDate = parseCalendarDate(input.endDate);

  if (endDate.getTime() < startDate.getTime()) {
    throw badRequest("endDate must be on or after startDate", {
      startDate: formatCalendarDate(startDate),
      endDate: formatCalendarDate(endDate),
    });
  }

  const equipment = await db.equipment.findUnique({
    where: { id: input.equipmentId },
    select: { id: true },
  });
  if (!equipment) {
    throw notFound(`Equipment "${input.equipmentId}" was not found`);
  }

  const overlapping = await db.equipmentBlackout.findFirst({
    where: {
      equipmentId: input.equipmentId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: blackoutRangeFields,
  });
  if (overlapping) {
    throw conflict("That equipment already has a blackout overlapping these dates", {
      blackout: serializeBlackout(overlapping),
    });
  }

  const created = await db.equipmentBlackout.create({
    data: {
      equipmentId: input.equipmentId,
      startDate,
      endDate,
      reason: input.reason.trim(),
    },
    select: adminBlackoutFields,
  });

  return toAdminBlackout(created);
}

export async function deleteBlackout(id: string): Promise<void> {
  const deleted = await db.equipmentBlackout.deleteMany({ where: { id } });
  if (deleted.count === 0) {
    throw notFound(`Blackout "${id}" was not found`);
  }
}
