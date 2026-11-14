import type { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, notFound } from "../lib/api-error";
import { parseCalendarDate } from "../lib/dates";
import { money } from "../lib/money";
import type { EquipmentListQuery } from "../schemas/catalogue";
import { getAvailability } from "./availability";

/**
 * `imagePublicId` is deliberately absent: it is a Cloudinary handle for deletion, not
 * something the public site needs. Prices are Decimal columns and are formatted below.
 */
const equipmentSummaryFields = {
  id: true,
  slug: true,
  name: true,
  description: true,
  imageUrl: true,
  note: true,
  pricePerDay: true,
  pricePerWeek: true,
  flatPrice: true,
  minQuantity: true,
  maxQuantity: true,
  category: { select: { slug: true, name: true } },
  inventory: { select: { total: true } },
} satisfies Prisma.EquipmentSelect;

const equipmentDetailFields = {
  ...equipmentSummaryFields,
  category: { select: { slug: true, name: true, parent: { select: { slug: true, name: true } } } },
} satisfies Prisma.EquipmentSelect;

type EquipmentRow = Prisma.EquipmentGetPayload<{ select: typeof equipmentSummaryFields }>;
type EquipmentDetailRow = Prisma.EquipmentGetPayload<{ select: typeof equipmentDetailFields }>;

function toSummary(row: EquipmentRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    note: row.note,
    pricePerDay: money(row.pricePerDay),
    pricePerWeek: money(row.pricePerWeek),
    flatPrice: money(row.flatPrice),
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    total: row.inventory[0]?.total ?? 0,
    category: row.category,
  };
}

export async function listEquipment(query: EquipmentListQuery) {
  const where: Prisma.EquipmentWhereInput = { isActive: true };

  if (query.category) {
    where.categoryId = { in: await categoryIdsForSlug(query.category) };
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await db.$transaction([
    db.equipment.count({ where }),
    db.equipment.findMany({
      where,
      select: equipmentSummaryFields,
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  const availability = await availabilityForQuery(
    query,
    rows.map((row) => row.id),
  );

  return {
    data: rows.map((row) => ({
      ...toSummary(row),
      ...(availability ? { available: availability.get(row.id) ?? 0 } : {}),
    })),
    meta: { total, page: query.page, pageSize: query.pageSize },
  };
}

export async function getEquipmentBySlug(slug: string) {
  const row: EquipmentDetailRow | null = await db.equipment.findFirst({
    where: { slug, isActive: true },
    select: equipmentDetailFields,
  });

  if (!row) {
    throw notFound(`Equipment "${slug}" was not found`);
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    note: row.note,
    pricePerDay: money(row.pricePerDay),
    pricePerWeek: money(row.pricePerWeek),
    flatPrice: money(row.flatPrice),
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    total: row.inventory[0]?.total ?? 0,
    category: row.category,
  };
}

/** A group category filters by itself and its children, so its page is never empty. */
async function categoryIdsForSlug(slug: string): Promise<string[]> {
  const category = await db.category.findUnique({
    where: { slug },
    select: { id: true, children: { select: { id: true } } },
  });

  if (!category) {
    throw notFound(`Category "${slug}" was not found`);
  }

  return [category.id, ...category.children.map((child) => child.id)];
}

/** Returns availability keyed by equipment id, or null when no dates were supplied. */
async function availabilityForQuery(
  query: EquipmentListQuery,
  equipmentIds: string[],
): Promise<Map<string, number> | null> {
  if (query.startDate === undefined || query.endDate === undefined) {
    return null;
  }

  const startDate = parseCalendarDate(query.startDate);
  const endDate = parseCalendarDate(query.endDate);
  if (startDate.getTime() > endDate.getTime()) {
    throw badRequest("endDate must be on or after startDate");
  }

  const rows = await getAvailability({ equipmentIds, startDate, endDate });
  return new Map(rows.map((row) => [row.equipmentId, row.available]));
}
