import type { DiscountType, OfferAppliesTo, Prisma } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, notFound } from "../lib/api-error";
import { money } from "../lib/money";
import type { CreateOfferInput, UpdateOfferInput } from "../schemas/offers";

const offerFields = {
  id: true,
  slug: true,
  name: true,
  description: true,
  discountType: true,
  discountValue: true,
  appliesTo: true,
  appliesToId: true,
  code: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OfferSelect;

type OfferRow = Prisma.OfferGetPayload<{ select: typeof offerFields }>;

function toPublicOffer(row: OfferRow) {
  const { isActive: _isActive, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row;
  return { ...rest, discountValue: money(row.discountValue) };
}

function toAdminOffer(row: OfferRow) {
  return { ...row, discountValue: money(row.discountValue) };
}

/**
 * Offers are display-only in the MVP (no discount engine), so the public list is just
 * the active ones inside their date window. A null bound means "no limit".
 */
export async function listOffers() {
  const now = new Date();

  const offers = await db.offer.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: offerFields,
    orderBy: { createdAt: "desc" },
  });

  return offers.map(toPublicOffer);
}

// ---------------------------------------------------------------------------
// Admin management (F4). The percentage cap and the single-item target can only
// be judged against the effective values of a partial update, so they live here
// rather than in the schema.
// ---------------------------------------------------------------------------

function assertOfferRules(offer: {
  discountType: DiscountType;
  discountValue: Prisma.Decimal | string;
  appliesTo: OfferAppliesTo;
  appliesToId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
}): void {
  const value = Number(offer.discountValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw badRequest("discountValue must be greater than 0", { field: "discountValue" });
  }

  if (offer.discountType === "PERCENTAGE" && value > 100) {
    throw badRequest("A percentage discount cannot exceed 100", { field: "discountValue" });
  }

  if (
    (offer.appliesTo === "ONE_EQUIPMENT" || offer.appliesTo === "ONE_PACKAGE") &&
    !offer.appliesToId
  ) {
    throw badRequest(
      `appliesToId is required when the offer applies to ${offer.appliesTo === "ONE_EQUIPMENT" ? "one equipment item" : "one package"}`,
      { field: "appliesToId" },
    );
  }

  if (offer.startsAt && offer.endsAt && offer.endsAt.getTime() < offer.startsAt.getTime()) {
    throw badRequest("endsAt must be on or after startsAt", { field: "endsAt" });
  }
}

export async function listAdminOffers() {
  const offers = await db.offer.findMany({
    select: offerFields,
    orderBy: { createdAt: "desc" },
  });

  return offers.map(toAdminOffer);
}

export async function getAdminOfferById(id: string) {
  const offer = await db.offer.findUnique({ where: { id }, select: offerFields });
  if (!offer) {
    throw notFound(`Offer "${id}" was not found`);
  }
  return toAdminOffer(offer);
}

export async function createOffer(input: CreateOfferInput) {
  assertOfferRules({
    ...input,
    appliesToId: input.appliesToId ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  });

  const created = await db.offer.create({ data: input, select: { id: true } });
  return getAdminOfferById(created.id);
}

export async function updateOfferById(id: string, input: UpdateOfferInput) {
  const existing = await db.offer.findUnique({ where: { id }, select: offerFields });
  if (!existing) {
    throw notFound(`Offer "${id}" was not found`);
  }

  assertOfferRules({
    discountType: input.discountType ?? existing.discountType,
    discountValue: input.discountValue ?? existing.discountValue,
    appliesTo: input.appliesTo ?? existing.appliesTo,
    appliesToId: input.appliesToId !== undefined ? input.appliesToId : existing.appliesToId,
    startsAt: input.startsAt !== undefined ? input.startsAt : existing.startsAt,
    endsAt: input.endsAt !== undefined ? input.endsAt : existing.endsAt,
  });

  await db.offer.update({ where: { id }, data: input });
  return getAdminOfferById(id);
}

export async function deleteOfferById(id: string): Promise<void> {
  const existing = await db.offer.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound(`Offer "${id}" was not found`);
  }
  await db.offer.delete({ where: { id } });
}
