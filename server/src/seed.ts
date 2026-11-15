import "dotenv/config";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { db, ensureClient } from "./config/db";

/**
 * Idempotent seeders: every row is matched by its natural key (slug, email) and left
 * untouched when it already exists, so re-running the seed on a live database never
 * duplicates catalogue rows or overwrites edits the owner made in the admin.
 */
function upsertCategory(input: { data: Prisma.CategoryUncheckedCreateInput }) {
  return db.category.upsert({
    where: { slug: input.data.slug },
    update: {},
    create: input.data,
  });
}

function upsertEquipment(input: { data: Prisma.EquipmentUncheckedCreateInput }) {
  return db.equipment.upsert({
    where: { slug: input.data.slug },
    update: {},
    create: input.data,
  });
}

function upsertPackage(input: { data: Prisma.PackageUncheckedCreateInput }) {
  return db.package.upsert({
    where: { slug: input.data.slug },
    update: {},
    create: input.data,
  });
}

function upsertOffer(input: { data: Prisma.OfferUncheckedCreateInput }) {
  return db.offer.upsert({
    where: { slug: input.data.slug },
    update: {},
    create: input.data,
  });
}

async function main() {
  // `db` is only bound once ensureClient() has connected; touching it earlier throws.
  await ensureClient();
  console.log("seeding...");

  // ---- Admin ----
  const adminPassword = await bcrypt.hash("partyplay-admin-2024", 12);
  const admin = await db.admin.upsert({
    where: { email: "owner@partyplay.co.ke" },
    update: {},
    create: {
      email: "owner@partyplay.co.ke",
      name: "PartyPlay Owner",
      password: adminPassword,
      role: "OWNER",
    },
  });
  console.log("admin:", admin.email);

  // ---- Site settings for the admin ----
  await db.siteSetting.upsert({
    where: { adminId: admin.id },
    update: {},
    create: {
      adminId: admin.id,
      businessName: "PartyPlay",
      contactPhone: "+254700000000",
      contactWhatsApp: "+254700000000",
      contactEmail: "hello@partyplay.co.ke",
      address: "Nairobi, Kenya",
      defaultDurationDays: 1,
      holdMinutes: 120,
      currency: "KES",
    },
  });
  console.log("site settings created");

  // ---- Categories (a group plus its children) ----
  // The children are kept in variables: equipment belongs to the leaf categories, so a
  // group page still shows its items through the category filter that includes children.
  const bouncing = await upsertCategory({
    data: {
      slug: "bouncing-castles",
      name: "Bouncing Castles",
      isGroup: true,
      description: "Inflatable castles for kids' parties and events.",
    },
  });
  const comboCastles = await upsertCategory({
    data: {
      slug: "combo-castles",
      name: "Combo Castles",
      parentId: bouncing.id,
      description: "Castles with a slide or swing attached.",
    },
  });
  const smallCastles = await upsertCategory({
    data: {
      slug: "small-castles",
      name: "Small Castles",
      parentId: bouncing.id,
      description: "Single-unit castles for smaller gatherings.",
    },
  });

  const tables = await upsertCategory({
    data: {
      slug: "tables-chairs",
      name: "Tables and Chairs",
      isGroup: true,
      description: "Foldable tables and stacking chairs.",
    },
  });
  const chairs = await upsertCategory({
    data: {
      slug: "chairs",
      name: "Chairs",
      parentId: tables.id,
    },
  });
  const foldingTables = await upsertCategory({
    data: {
      slug: "tables",
      name: "Tables",
      parentId: tables.id,
    },
  });

  const sound = await upsertCategory({
    data: {
      slug: "sound-systems",
      name: "Sound Systems",
      isGroup: true,
      description: "Speakers, microphones and DJ setups.",
    },
  });
  console.log("categories ready");

  // ---- Equipment with inventory ----
  const castle1 = await upsertEquipment({
    data: {
      slug: "fun-bounce-combo-castle",
      name: "Fun Bounce Combo Castle",
      categoryId: comboCastles.id,
      description:
        "Two-level bounce castle with a small slide. Suitable for ages 3–10. Requires a flat, dry surface and a power source nearby if using blowers.",
      note: "Recommend an adult attendant during use.",
      minQuantity: 1,
      maxQuantity: 8,
      pricePerDay: 4500,
      pricePerWeek: 22000,
      pricingMode: "PER_DAY",
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: castle1.id },
    update: {},
    create: { equipmentId: castle1.id, total: 5 },
  });

  const castle2 = await upsertEquipment({
    data: {
      slug: "happy-kids-castle",
      name: "Happy Kids Castle",
      categoryId: smallCastles.id,
      description: "Single-unit bounce castle, 3m x 3m. Great for birthdays.",
      minQuantity: 1,
      maxQuantity: 6,
      pricePerDay: 3000,
      pricePerWeek: 15000,
      pricingMode: "PER_DAY",
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: castle2.id },
    update: {},
    create: { equipmentId: castle2.id, total: 4 },
  });

  const chairSet = await upsertEquipment({
    data: {
      slug: "stacking-chair-set",
      name: "Stacking Chair Set",
      categoryId: chairs.id,
      description: "A set of 20 stacking plastic chairs. Ideal for party seating.",
      note: "Include legs and stacking straps.",
      minQuantity: 1,
      maxQuantity: 50,
      flatPrice: 2500,
      pricingMode: "FLAT",
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: chairSet.id },
    update: {},
    create: { equipmentId: chairSet.id, total: 60 },
  });

  const tableSet = await upsertEquipment({
    data: {
      slug: "six-foot-folding-table",
      name: "6ft Folding Table",
      categoryId: foldingTables.id,
      description: "Rectangular 6ft folding table. Used for food, gifts, cake displays.",
      minQuantity: 1,
      maxQuantity: 20,
      flatPrice: 1200,
      pricingMode: "FLAT",
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: tableSet.id },
    update: {},
    create: { equipmentId: tableSet.id, total: 15 },
  });

  const speakerPair = await upsertEquipment({
    data: {
      slug: "party-speaker-pair",
      name: "Party Speaker Pair",
      categoryId: sound.id,
      description:
        "Two powered speakers with stands and microphones. Suitable for indoor and outdoor parties with up to 80 guests.",
      note: "Power cables included. Customer responsible for safe setup.",
      minQuantity: 1,
      maxQuantity: 4,
      flatPrice: 5000,
      pricingMode: "FLAT",
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: speakerPair.id },
    update: {},
    create: { equipmentId: speakerPair.id, total: 3 },
  });

  console.log("equipment ready");

  // ---- Package ----
  const birthdayPackage = await upsertPackage({
    data: {
      slug: "birthday-party-starter",
      name: "Birthday Party Starter",
      description:
        "A complete starter package for a kids' birthday party: one bounce castle, seating for 20 guests, a table, and a speaker pair.",
      imagePublicId: "packages/birthday-starter",
      price: 14500,
      minQuantity: 10,
      maxQuantity: 40,
      duration: 1,
      isFeatured: true,
      isActive: true,
    },
  });
  // One row per equipment in the package; the unique key makes re-seeding a no-op.
  for (const item of [
    { equipmentId: castle2.id, quantity: 1 },
    { equipmentId: chairSet.id, quantity: 1 },
    { equipmentId: tableSet.id, quantity: 1 },
    { equipmentId: speakerPair.id, quantity: 1 },
  ]) {
    await db.packageItem.upsert({
      where: {
        packageId_equipmentId: { packageId: birthdayPackage.id, equipmentId: item.equipmentId },
      },
      update: {},
      create: { packageId: birthdayPackage.id, ...item },
    });
  }
  console.log("package ready");

  // ---- Offer ----
  await upsertOffer({
    data: {
      slug: "first-booking-discount",
      name: "First Booking Discount",
      description: "10% off your first booking with us.",
      discountType: "PERCENTAGE",
      discountValue: 10,
      appliesTo: "ALL_BOOKINGS",
      code: "FIRST10",
      startsAt: new Date(),
      isActive: true,
    },
  });
  console.log("offer ready");

  console.log("seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
