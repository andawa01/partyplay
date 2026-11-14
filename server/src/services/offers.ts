import { db } from "../config/db";
import { money } from "../lib/money";

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
    select: {
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
    },
    orderBy: { createdAt: "desc" },
  });

  return offers.map((offer) => ({
    ...offer,
    discountValue: money(offer.discountValue),
  }));
}
