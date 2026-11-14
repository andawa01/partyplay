import type { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, conflict, notFound } from "../lib/api-error";
import { money } from "../lib/money";
import type {
  CreatePackageInput,
  PackageItemsInput,
  UpdatePackageInput,
} from "../schemas/packages";

const packageFields = {
  id: true,
  slug: true,
  name: true,
  description: true,
  imageUrl: true,
  price: true,
  minQuantity: true,
  maxQuantity: true,
  duration: true,
  isFeatured: true,
  items: {
    select: { quantity: true, equipment: { select: { slug: true, name: true } } },
    orderBy: { quantity: "desc" },
  },
} satisfies Prisma.PackageSelect;

type PackageRow = Prisma.PackageGetPayload<{ select: typeof packageFields }>;

function toPublicPackage(row: PackageRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    price: money(row.price),
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    duration: row.duration,
    isFeatured: row.isFeatured,
    items: row.items.map((item) => ({
      quantity: item.quantity,
      equipment: item.equipment,
    })),
  };
}

export async function listPackages() {
  const rows = await db.package.findMany({
    where: { isActive: true },
    select: packageFields,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });

  return rows.map(toPublicPackage);
}

export async function getPackageBySlug(slug: string) {
  const row = await db.package.findFirst({
    where: { slug, isActive: true },
    select: packageFields,
  });

  if (!row) {
    throw notFound(`Package "${slug}" was not found`);
  }

  return toPublicPackage(row);
}

// ---------------------------------------------------------------------------
// Admin management (F4).
// ---------------------------------------------------------------------------

const adminPackageFields = {
  ...packageFields,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      equipmentId: true,
      quantity: true,
      equipment: { select: { slug: true, name: true } },
    },
    orderBy: { quantity: "desc" },
  },
} satisfies Prisma.PackageSelect;

type AdminPackageRow = Prisma.PackageGetPayload<{ select: typeof adminPackageFields }>;

function toAdminPackage(row: AdminPackageRow) {
  return {
    ...toPublicPackage(row),
    items: row.items.map((item) => ({
      equipmentId: item.equipmentId,
      quantity: item.quantity,
      equipment: item.equipment,
    })),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAdminPackages() {
  const rows = await db.package.findMany({
    select: adminPackageFields,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return rows.map(toAdminPackage);
}

export async function getAdminPackageById(id: string) {
  const row = await db.package.findUnique({ where: { id }, select: adminPackageFields });
  if (!row) {
    throw notFound(`Package "${id}" was not found`);
  }
  return toAdminPackage(row);
}

export async function createPackage(input: CreatePackageInput) {
  const created = await db.package.create({ data: input, select: { id: true } });
  return getAdminPackageById(created.id);
}

export async function updatePackageById(id: string, input: UpdatePackageInput) {
  await assertPackageExists(id);
  await db.package.update({ where: { id }, data: input });
  return getAdminPackageById(id);
}

/** A package that appears on a booking is deactivated instead of deleted. */
export async function deletePackageById(id: string): Promise<void> {
  await assertPackageExists(id);

  const bookingCount = await db.packageBooking.count({ where: { packageId: id } });
  if (bookingCount > 0) {
    throw conflict(
      `This package is used by ${bookingCount} booking(s). Deactivate it instead of deleting.`,
      { bookingCount },
    );
  }

  await db.package.delete({ where: { id } });
}

/** Replaces the whole item set atomically, so a failure never leaves a half package. */
export async function replacePackageItems(id: string, input: PackageItemsInput) {
  await assertPackageExists(id);

  if (input.items.length > 0) {
    const equipmentIds = input.items.map((item) => item.equipmentId);
    const found = await db.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((row) => row.id));
    const missingEquipmentIds = equipmentIds.filter((equipmentId) => !foundIds.has(equipmentId));

    if (missingEquipmentIds.length > 0) {
      throw badRequest("Some equipment items do not exist", { missingEquipmentIds });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.packageItem.deleteMany({ where: { packageId: id } });
    if (input.items.length > 0) {
      await tx.packageItem.createMany({
        data: input.items.map((item) => ({
          packageId: id,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      });
    }
  });

  return getAdminPackageById(id);
}

async function assertPackageExists(id: string): Promise<void> {
  const found = await db.package.findUnique({ where: { id }, select: { id: true } });
  if (!found) {
    throw notFound(`Package "${id}" was not found`);
  }
}
