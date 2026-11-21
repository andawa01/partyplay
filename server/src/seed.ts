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

/** One row per equipment in a package; the unique key makes re-seeding a no-op. */
async function upsertPackageItems(
  packageId: string,
  items: { equipmentId: string; quantity: number }[],
) {
  for (const item of items) {
    await db.packageItem.upsert({
      where: {
        packageId_equipmentId: { packageId, equipmentId: item.equipmentId },
      },
      update: {},
      create: { packageId, ...item },
    });
  }
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
      imageUrl:
        "https://images.pexels.com/photos/35532067/pexels-photo-35532067.jpeg?auto=compress&cs=tinysrgb&w=1200",
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
      imageUrl:
        "https://images.pexels.com/photos/296308/pexels-photo-296308.jpeg?auto=compress&cs=tinysrgb&w=1200",
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
      imageUrl:
        "https://images.pexels.com/photos/26832125/pexels-photo-26832125.jpeg?auto=compress&cs=tinysrgb&w=1200",
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
      imageUrl:
        "https://images.pexels.com/photos/1209776/pexels-photo-1209776.jpeg?auto=compress&cs=tinysrgb&w=1200",
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
      imageUrl:
        "https://images.pexels.com/photos/39204570/pexels-photo-39204570.jpeg?auto=compress&cs=tinysrgb&w=1200",
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
      imageUrl:
        "https://images.pexels.com/photos/16935999/pexels-photo-16935999.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imagePublicId: "packages/birthday-starter",
      price: 14500,
      minQuantity: 10,
      maxQuantity: 40,
      duration: 1,
      isFeatured: true,
      isActive: true,
    },
  });
  await upsertPackageItems(birthdayPackage.id, [
    { equipmentId: castle2.id, quantity: 1 },
    { equipmentId: chairSet.id, quantity: 1 },
    { equipmentId: tableSet.id, quantity: 1 },
    { equipmentId: speakerPair.id, quantity: 1 },
  ]);

  const castleSoundPackage = await upsertPackage({
    data: {
      slug: "castle-sound-combo",
      name: "Castle & Sound Combo",
      description:
        "One combo bounce castle plus a powered speaker pair with microphones. A straightforward setup for a garden or estate party of up to 60 guests.",
      imageUrl:
        "https://images.pexels.com/photos/39922917/pexels-photo-39922917.jpeg?auto=compress&cs=tinysrgb&w=1200",
      price: 8500,
      minQuantity: 15,
      maxQuantity: 60,
      duration: 1,
      isFeatured: true,
      isActive: true,
    },
  });
  await upsertPackageItems(castleSoundPackage.id, [
    { equipmentId: castle1.id, quantity: 1 },
    { equipmentId: speakerPair.id, quantity: 1 },
  ]);

  const gardenSetPackage = await upsertPackage({
    data: {
      slug: "garden-table-chairs",
      name: "Garden Table & Chairs Set",
      description:
        "Two folding tables and a set of 20 stacking chairs — seating and serving for a relaxed garden gathering.",
      imageUrl:
        "https://images.pexels.com/photos/33029993/pexels-photo-33029993.jpeg?auto=compress&cs=tinysrgb&w=1200",
      price: 4400,
      minQuantity: 20,
      maxQuantity: 80,
      duration: 1,
      isFeatured: false,
      isActive: true,
    },
  });
  await upsertPackageItems(gardenSetPackage.id, [
    { equipmentId: chairSet.id, quantity: 1 },
    { equipmentId: tableSet.id, quantity: 2 },
  ]);

  const partyWeekendPackage = await upsertPackage({
    data: {
      slug: "premium-party-weekend",
      name: "Premium Party Weekend",
      description:
        "The full setup for a weekend celebration: bounce castle, seating, tables and a speaker pair, delivered together for two days.",
      imageUrl:
        "https://images.pexels.com/photos/11522856/pexels-photo-11522856.jpeg?auto=compress&cs=tinysrgb&w=1200",
      price: 18900,
      minQuantity: 20,
      maxQuantity: 80,
      duration: 2,
      isFeatured: true,
      isActive: true,
    },
  });
  await upsertPackageItems(partyWeekendPackage.id, [
    { equipmentId: castle2.id, quantity: 1 },
    { equipmentId: chairSet.id, quantity: 1 },
    { equipmentId: tableSet.id, quantity: 2 },
    { equipmentId: speakerPair.id, quantity: 1 },
  ]);
  console.log("packages ready");

  // ---- Offers (display-only in the MVP: none of these are redeemable in the client) ----
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
  await upsertOffer({
    data: {
      slug: "weekday-hire-offer",
      name: "Weekday Hire Offer",
      description:
        "15% off equipment hire for events held Monday to Thursday. Ask the owner when you send your request.",
      discountType: "PERCENTAGE",
      discountValue: 15,
      appliesTo: "ALL_EQUIPMENT",
      startsAt: new Date(),
      endsAt: new Date("2027-02-28T23:59:59+03:00"),
      isActive: true,
    },
  });
  await upsertOffer({
    data: {
      slug: "festive-package-offer",
      name: "Festive Package Offer",
      description:
        "Save KES 2,000 on any package booked for December and January celebrations.",
      discountType: "FIXED_AMOUNT",
      discountValue: 2000,
      appliesTo: "ALL_PACKAGES",
      startsAt: new Date(),
      endsAt: new Date("2027-01-31T23:59:59+03:00"),
      isActive: true,
    },
  });
  console.log("offers ready");

  console.log("seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
