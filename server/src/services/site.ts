import { db } from "../config/db";
import { notFound } from "../lib/api-error";

/**
 * One owner means one settings row. Only customer-facing fields are selected: `id`,
 * `adminId` and `updatedAt` stay server-side, and `holdMinutes` is operational.
 */
export async function getPublicSite() {
  const [settings, transportProviders] = await Promise.all([
    db.siteSetting.findFirst({
      select: {
        businessName: true,
        contactPhone: true,
        contactWhatsApp: true,
        contactEmail: true,
        address: true,
        aboutText: true,
        facebookUrl: true,
        instagramUrl: true,
        tiktokUrl: true,
        xUrl: true,
        defaultDurationDays: true,
        currency: true,
      },
    }),
    db.transportProvider.findMany({
      where: { isActive: true },
      select: { name: true, phone: true, serviceArea: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!settings) {
    throw notFound("Site settings are not configured yet");
  }

  return { ...settings, transportProviders };
}
