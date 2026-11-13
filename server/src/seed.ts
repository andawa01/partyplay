import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { db } from "./config/db";

// seed.ts reuses the shared client for seed data.
if (process.env.NODE_ENV !== "production") {
  // In dev with tsx watch, ensure the singleton is warm.
  void db.$queryRaw`SELECT 1`;
}

async function main() {
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

  // ---- Categories (with a group + children) ----
  const bouncing = await db.category.create({
    data: {
      slug: "bouncing-castles",
      name: "Bouncing Castles",
      isGroup: true,
      description: "Inflatable castles for kids' parties and events.",
    },
    include: { children: true },
  });
  await db.category.create({
    data: {
      slug: "combo-castles",
      name: "Combo Castles",
      parentId: bouncing.id,
      description: "Castles with a slide or swing attached.",
    },
  });
  await db.category.create({
    data: {
      slug: "small-castles",
      name: "Small Castles",
      parentId: bouncing.id,
      description: "Single-unit castles for smaller gatherings.",
    },
  });

  const tables = await db.category.create({
    data: {
      slug: "tables-chairs",
      name: "Tables and Chairs",
      isGroup: true,
      description: "Foldable tables and stacking chairs.",
    },
    include: { children: true },
  });
  await db.category.create({
    data: {
      slug: "chairs",
      name: "Chairs",
      parentId: tables.id,
    },
  });
  await db.category.create({
    data: {
      slug: "tables",
      name: "Tables",
      parentId: tables.id,
    },
  });

  const sound = await db.category.create({
    data: {
      slug: "sound-systems",
      name: "Sound Systems",
      isGroup: true,
      description: "Speakers, microphones and DJ setups.",
    },
  });
  console.log("categories created");

  // ---- Equipment with inventory ----
  const castle1 = await db.equipment.create({
    data: {
      slug: "fun-bounce-combo-castle",
      name: "Fun Bounce Combo Castle",
      categoryId: bouncing.children[0]?.id ?? bouncing.id,
      description:
        "Two-level bounce castle with a small slide. Suitable for ages 3–10. Requires a flat, dry surface and a power source nearby if using blowers.",
      note: "Recommend an adult attendant during use.",
      minQuantity: 1,
      maxQuantity: 8,
      pricePerDay: 4500,
      pricePerWeek: 22000,
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: castle1.id },
    update: {},
    create: { equipmentId: castle1.id, total: 5 },
  });

  const castle2 = await db.equipment.create({
    data: {
      slug: "happy-kids-castle",
      name: "Happy Kids Castle",
      categoryId: bouncing.children[1]?.id ?? bouncing.id,
      description: "Single-unit bounce castle, 3m x 3m. Great for birthdays.",
      minQuantity: 1,
      maxQuantity: 6,
      pricePerDay: 3000,
      pricePerWeek: 15000,
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: castle2.id },
    update: {},
    create: { equipmentId: castle2.id, total: 4 },
  });

  const chairSet = await db.equipment.create({
    data: {
      slug: "stacking-chair-set",
      name: "Stacking Chair Set",
      categoryId: tables.children[0]?.id ?? tables.id,
      description: "A set of 20 stacking plastic chairs. Ideal for party seating.",
      note: "Include legs and stacking straps.",
      minQuantity: 1,
      maxQuantity: 50,
      flatPrice: 2500,
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: chairSet.id },
    update: {},
    create: { equipmentId: chairSet.id, total: 60 },
  });

  const tableSet = await db.equipment.create({
    data: {
      slug: "six-foot-folding-table",
      name: "6ft Folding Table",
      categoryId: tables.children[1]?.id ?? tables.id,
      description: "Rectangular 6ft folding table. Used for food, gifts, cake displays.",
      minQuantity: 1,
      maxQuantity: 20,
      flatPrice: 1200,
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: tableSet.id },
    update: {},
    create: { equipmentId: tableSet.id, total: 15 },
  });

  const speakerPair = await db.equipment.create({
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
      isActive: true,
    },
  });
  await db.equipmentInventory.upsert({
    where: { equipmentId: speakerPair.id },
    update: {},
    create: { equipmentId: speakerPair.id, total: 3 },
  });

  console.log("equipment created");

  // ---- Package ----
  const birthdayPackage = await db.package.create({
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
  await db.packageItem.createMany({
    data: [
      { packageId: birthdayPackage.id, equipmentId: castle2.id, quantity: 1 },
      { packageId: birthdayPackage.id, equipmentId: chairSet.id, quantity: 1 },
      { packageId: birthdayPackage.id, equipmentId: tableSet.id, quantity: 1 },
      { packageId: birthdayPackage.id, equipmentId: speakerPair.id, quantity: 1 },
    ],
  });
  console.log("package created");

  // ---- Offer ----
  await db.offer.create({
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
  console.log("offer created");

  console.log("seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
