import type { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { notFound } from "../lib/api-error";
import { money } from "../lib/money";

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
