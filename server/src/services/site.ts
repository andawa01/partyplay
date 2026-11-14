import type { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { notFound } from "../lib/api-error";
import type { UpdateSettingsInput } from "../schemas/settings";

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

// ---------------------------------------------------------------------------
// Admin settings (F4). One row per admin, so the upsert keys on `adminId`.
// `adminId` itself stays out of the response.
// ---------------------------------------------------------------------------

const adminSettingsFields = {
  id: true,
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
  holdMinutes: true,
  currency: true,
  updatedAt: true,
} satisfies Prisma.SiteSettingSelect;

export async function getAdminSettings() {
  const settings = await db.siteSetting.findFirst({ select: adminSettingsFields });
  if (!settings) {
    throw notFound("Site settings have not been created yet");
  }
  return settings;
}

export async function updateSettings(adminId: string, input: UpdateSettingsInput) {
  return db.siteSetting.upsert({
    where: { adminId },
    update: input,
    create: { adminId, ...input },
    select: adminSettingsFields,
  });
}
