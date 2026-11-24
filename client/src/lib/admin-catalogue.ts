import type { ZodError } from "zod";
import { z } from "zod";

import type { EquipmentCategory, PricingMode } from "./catalogue";

export interface AdminEquipment {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  note: string | null;
  pricePerDay: string | null;
  pricePerWeek: string | null;
  flatPrice: string | null;
  pricingMode: PricingMode;
  minQuantity: number;
  maxQuantity: number;
  total: number;
  category: EquipmentCategory & { parent: EquipmentCategory | null };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isGroup: boolean;
  parentId: string | null;
  parent?: { id: string; slug: string; name: string } | null;
  children?: AdminCategory[];
  equipment?: Array<{ id: string; slug: string; name: string }>;
}

export interface AdminPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  price: string;
  minQuantity: number;
  maxQuantity: number | null;
  duration: number | null;
  isFeatured: boolean;
  isActive: boolean;
  items: Array<{
    equipmentId: string;
    quantity: number;
    equipment: { slug: string; name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export type OfferAppliesTo =
  | "ALL_BOOKINGS"
  | "ALL_EQUIPMENT"
  | "ALL_PACKAGES"
  | "ONE_EQUIPMENT"
  | "ONE_PACKAGE";

export interface AdminOffer {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  appliesTo: OfferAppliesTo;
  appliesToId: string | null;
  code: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransportProvider {
  id: string;
  name: string;
  phone: string;
  serviceArea: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function formFieldErrors<T>(error: ZodError): FieldErrors<T> {
  const next: FieldErrors<T> = {};
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) {
      next[field as keyof T] = messages[0];
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Shared field rules. Form values stay strings so an empty optional field can
// mean "not set"; payload builders turn them into the numbers the server wants.
// ---------------------------------------------------------------------------

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(64, "Keep the slug to 64 characters")
  .regex(slugPattern, "Use lowercase letters, numbers and single hyphens");

const nameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(128, "Keep the name to 128 characters");

const optionalDescription = z
  .string()
  .trim()
  .max(2000, "Keep the description to 2000 characters");

const optionalUrl = z.string().trim().refine((value) => {
  if (value === "") {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Use a complete http:// or https:// image URL");

function optionalWholeNumber(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      `${label} must be a whole number from ${min} to ${max}`,
    );
}

function requiredWholeNumber(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      `${label} must be a whole number from ${min} to ${max}`,
    );
}

function optionalMoney(label: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 99_999_999.99),
      `${label} must be a positive number with up to 2 decimals`,
    );
}

function requiredMoney(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) =>
        /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 99_999_999.99,
      `${label} must be a positive number with up to 2 decimals`,
    );
}

function optionalDateTime(label: string) {
  return z.string().trim().refine((value) => {
    if (value === "") {
      return true;
    }
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }, `${label} is not a valid date and time`);
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export interface EquipmentFormValues {
  slug: string;
  name: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  note: string;
  pricingMode: PricingMode;
  pricePerDay: string;
  pricePerWeek: string;
  flatPrice: string;
  minQuantity: string;
  maxQuantity: string;
  isActive: boolean;
}

export const equipmentFormSchema = z
  .object({
    slug: slugField,
    name: nameField,
    categoryId: z.string().trim().min(1, "Choose a category"),
    description: optionalDescription,
    imageUrl: optionalUrl,
    imagePublicId: z.string().trim().max(128),
    note: z.string().trim().max(1000, "Keep the note to 1000 characters"),
    pricingMode: z.enum(["PER_DAY", "FLAT"]),
    pricePerDay: optionalMoney("Daily price"),
    pricePerWeek: optionalMoney("Weekly price"),
    flatPrice: optionalMoney("Flat price"),
    minQuantity: requiredWholeNumber(1, 10_000, "Minimum quantity"),
    maxQuantity: requiredWholeNumber(1, 10_000, "Maximum quantity"),
    isActive: z.boolean(),
  })
  .refine((values) => Number(values.maxQuantity) >= Number(values.minQuantity), {
    message: "Maximum quantity must be at least the minimum",
    path: ["maxQuantity"],
  })
  .refine(
    (values) =>
      values.pricingMode === "FLAT" ? values.flatPrice !== "" : values.pricePerDay !== "",
    {
      message:
        "Set the price used by this pricing mode so the public catalogue can show a price",
      path: ["pricePerDay"],
    },
  );

export interface EquipmentWriteInput {
  slug?: string;
  name: string;
  categoryId: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  note: string | null;
  pricingMode: PricingMode;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  flatPrice: number | null;
  minQuantity: number;
  maxQuantity: number;
  isActive: boolean;
}

export function emptyEquipmentForm(categoryId = ""): EquipmentFormValues {
  return {
    slug: "",
    name: "",
    categoryId,
    description: "",
    imageUrl: "",
    imagePublicId: "",
    note: "",
    pricingMode: "PER_DAY",
    pricePerDay: "",
    pricePerWeek: "",
    flatPrice: "",
    minQuantity: "1",
    maxQuantity: "10",
    isActive: true,
  };
}

export function equipmentToForm(
  equipment: AdminEquipment,
  categoryId: string,
): EquipmentFormValues {
  return {
    slug: equipment.slug,
    name: equipment.name,
    categoryId: categoryId || "",
    description: equipment.description ?? "",
    imageUrl: equipment.imageUrl ?? "",
    imagePublicId: equipment.imagePublicId ?? "",
    note: equipment.note ?? "",
    pricingMode: equipment.pricingMode,
    pricePerDay: equipment.pricePerDay ?? "",
    pricePerWeek: equipment.pricePerWeek ?? "",
    flatPrice: equipment.flatPrice ?? "",
    minQuantity: String(equipment.minQuantity),
    maxQuantity: String(equipment.maxQuantity),
    isActive: equipment.isActive,
  };
}

export function equipmentPayload(values: EquipmentFormValues): EquipmentWriteInput {
  return {
    ...(values.slug ? { slug: values.slug } : {}),
    name: values.name.trim(),
    categoryId: values.categoryId,
    description: nullableText(values.description),
    imageUrl: nullableText(values.imageUrl),
    imagePublicId: nullableText(values.imagePublicId),
    note: nullableText(values.note),
    pricingMode: values.pricingMode,
    pricePerDay: nullableNumber(values.pricePerDay),
    pricePerWeek: nullableNumber(values.pricePerWeek),
    flatPrice: nullableNumber(values.flatPrice),
    minQuantity: Number(values.minQuantity),
    maxQuantity: Number(values.maxQuantity),
    isActive: values.isActive,
  };
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

export interface PackageItemFormValue {
  key: string;
  equipmentId: string;
  quantity: string;
}

export interface PackageFormValues {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  price: string;
  minQuantity: string;
  maxQuantity: string;
  duration: string;
  isFeatured: boolean;
  isActive: boolean;
  items: PackageItemFormValue[];
}

export const packageFormSchema = z
  .object({
    slug: slugField,
    name: nameField,
    description: optionalDescription,
    imageUrl: optionalUrl,
    imagePublicId: z.string().trim().max(128),
    price: requiredMoney("Package price"),
    minQuantity: requiredWholeNumber(1, 10_000, "Minimum quantity"),
    maxQuantity: optionalWholeNumber(1, 10_000, "Maximum quantity"),
    duration: optionalWholeNumber(1, 365, "Duration"),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    items: z
      .array(
        z.object({
          key: z.string(),
          equipmentId: z.string().min(1, "Choose an equipment item"),
          quantity: requiredWholeNumber(1, 10_000, "Item quantity"),
        }),
      )
      .max(100, "A package can include at most 100 equipment lines")
      .refine(
        (items) =>
          new Set(items.map((item) => item.equipmentId)).size === items.length,
        "Each equipment item can only appear once",
      ),
  })
  .refine(
    (values) =>
      values.maxQuantity === "" ||
      Number(values.maxQuantity) >= Number(values.minQuantity),
    {
      message: "Maximum quantity must be at least the minimum",
      path: ["maxQuantity"],
    },
  );

export interface PackageWriteInput {
  slug?: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  price: number;
  minQuantity: number;
  maxQuantity: number | null;
  duration: number | null;
  isFeatured: boolean;
  isActive: boolean;
  items: Array<{ equipmentId: string; quantity: number }>;
}

export function emptyPackageForm(): PackageFormValues {
  return {
    slug: "",
    name: "",
    description: "",
    imageUrl: "",
    imagePublicId: "",
    price: "",
    minQuantity: "1",
    maxQuantity: "",
    duration: "",
    isFeatured: false,
    isActive: true,
    items: [],
  };
}

export function packageToForm(pkg: AdminPackage): PackageFormValues {
  return {
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description ?? "",
    imageUrl: pkg.imageUrl ?? "",
    imagePublicId: pkg.imagePublicId ?? "",
    price: pkg.price,
    minQuantity: String(pkg.minQuantity),
    maxQuantity: pkg.maxQuantity === null ? "" : String(pkg.maxQuantity),
    duration: pkg.duration === null ? "" : String(pkg.duration),
    isFeatured: pkg.isFeatured,
    isActive: pkg.isActive,
    items: pkg.items.map((item) => ({
      key: item.equipmentId,
      equipmentId: item.equipmentId,
      quantity: String(item.quantity),
    })),
  };
}

export function packagePayload(values: PackageFormValues): PackageWriteInput {
  return {
    ...(values.slug ? { slug: values.slug } : {}),
    name: values.name.trim(),
    description: nullableText(values.description),
    imageUrl: nullableText(values.imageUrl),
    imagePublicId: nullableText(values.imagePublicId),
    price: Number(values.price),
    minQuantity: Number(values.minQuantity),
    maxQuantity: nullableNumber(values.maxQuantity),
    duration: nullableNumber(values.duration),
    isFeatured: values.isFeatured,
    isActive: values.isActive,
    items: values.items.map((item) => ({
      equipmentId: item.equipmentId,
      quantity: Number(item.quantity),
    })),
  };
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export interface OfferFormValues {
  slug: string;
  name: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  appliesTo: OfferAppliesTo;
  appliesToId: string;
  code: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export const offerFormSchema = z
  .object({
    slug: slugField,
    name: nameField,
    description: optionalDescription,
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: requiredMoney("Discount value"),
    appliesTo: z.enum([
      "ALL_BOOKINGS",
      "ALL_EQUIPMENT",
      "ALL_PACKAGES",
      "ONE_EQUIPMENT",
      "ONE_PACKAGE",
    ]),
    appliesToId: z.string(),
    code: z.string().trim().max(64, "Keep the code to 64 characters"),
    startsAt: optionalDateTime("Start"),
    endsAt: optionalDateTime("End"),
    isActive: z.boolean(),
  })
  .refine(
    (values) =>
      values.discountType !== "PERCENTAGE" || Number(values.discountValue) <= 100,
    {
      message: "A percentage cannot exceed 100",
      path: ["discountValue"],
    },
  )
  .refine(
    (values) =>
      !["ONE_EQUIPMENT", "ONE_PACKAGE"].includes(values.appliesTo) ||
      values.appliesToId !== "",
    {
      message: "Choose what this offer applies to",
      path: ["appliesToId"],
    },
  )
  .refine(
    (values) =>
      values.startsAt === "" ||
      values.endsAt === "" ||
      new Date(values.endsAt).getTime() >= new Date(values.startsAt).getTime(),
    {
      message: "The end must be on or after the start",
      path: ["endsAt"],
    },
  );

export interface OfferWriteInput {
  slug?: string;
  name: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  appliesTo: OfferAppliesTo;
  appliesToId: string | null;
  code: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export function emptyOfferForm(): OfferFormValues {
  return {
    slug: "",
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    appliesTo: "ALL_BOOKINGS",
    appliesToId: "",
    code: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  };
}

export function offerToForm(offer: AdminOffer): OfferFormValues {
  return {
    slug: offer.slug,
    name: offer.name,
    description: offer.description ?? "",
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    appliesTo: offer.appliesTo,
    appliesToId: offer.appliesToId ?? "",
    code: offer.code ?? "",
    startsAt: toDateTimeLocal(offer.startsAt),
    endsAt: toDateTimeLocal(offer.endsAt),
    isActive: offer.isActive,
  };
}

export function offerPayload(values: OfferFormValues): OfferWriteInput {
  return {
    ...(values.slug ? { slug: values.slug } : {}),
    name: values.name.trim(),
    description: nullableText(values.description),
    discountType: values.discountType,
    discountValue: Number(values.discountValue),
    appliesTo: values.appliesTo,
    appliesToId: nullableText(values.appliesToId),
    code: nullableText(values.code)?.toUpperCase() ?? null,
    startsAt: toIsoOrNull(values.startsAt),
    endsAt: toIsoOrNull(values.endsAt),
    isActive: values.isActive,
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryFormValues {
  slug: string;
  name: string;
  description: string;
  isGroup: boolean;
  parentId: string;
}

export const categoryFormSchema = z.object({
  slug: slugField,
  name: nameField,
  description: optionalDescription,
  isGroup: z.boolean(),
  parentId: z.string(),
});

export interface CategoryWriteInput {
  slug?: string;
  name: string;
  description: string | null;
  isGroup: boolean;
  parentId?: string;
}

export function emptyCategoryForm(): CategoryFormValues {
  return {
    slug: "",
    name: "",
    description: "",
    isGroup: false,
    parentId: "",
  };
}

export function categoryToForm(category: AdminCategory): CategoryFormValues {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description ?? "",
    isGroup: category.isGroup,
    parentId: category.parentId ?? "",
  };
}

export function categoryPayload(values: CategoryFormValues): CategoryWriteInput {
  return {
    ...(values.slug ? { slug: values.slug } : {}),
    name: values.name.trim(),
    description: nullableText(values.description),
    isGroup: values.isGroup,
    ...(values.parentId ? { parentId: values.parentId } : {}),
  };
}

// ---------------------------------------------------------------------------
// Transport providers
// ---------------------------------------------------------------------------

export interface TransportProviderFormValues {
  name: string;
  phone: string;
  serviceArea: string;
  notes: string;
  isActive: boolean;
}

export const transportProviderFormSchema = z.object({
  name: nameField,
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter exactly 10 digits, e.g. 0712345678"),
  serviceArea: z.string().trim().max(200, "Keep the service area to 200 characters"),
  notes: z.string().trim().max(1000, "Keep the notes to 1000 characters"),
  isActive: z.boolean(),
});

export interface TransportProviderWriteInput {
  name: string;
  phone: string;
  serviceArea: string | null;
  notes: string | null;
  isActive: boolean;
}

export function emptyTransportProviderForm(): TransportProviderFormValues {
  return {
    name: "",
    phone: "",
    serviceArea: "",
    notes: "",
    isActive: true,
  };
}

export function transportProviderToForm(
  provider: TransportProvider,
): TransportProviderFormValues {
  return {
    name: provider.name,
    phone: provider.phone,
    serviceArea: provider.serviceArea ?? "",
    notes: provider.notes ?? "",
    isActive: provider.isActive,
  };
}

export function transportProviderPayload(
  values: TransportProviderFormValues,
): TransportProviderWriteInput {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    serviceArea: nullableText(values.serviceArea),
    notes: nullableText(values.notes),
    isActive: values.isActive,
  };
}

// ---------------------------------------------------------------------------
// Labels and conversion helpers
// ---------------------------------------------------------------------------

export const offerAppliesToOptions: Array<{ value: OfferAppliesTo; label: string }> = [
  { value: "ALL_BOOKINGS", label: "All bookings" },
  { value: "ALL_EQUIPMENT", label: "All equipment" },
  { value: "ALL_PACKAGES", label: "All packages" },
  { value: "ONE_EQUIPMENT", label: "One equipment item" },
  { value: "ONE_PACKAGE", label: "One package" },
];

export function offerAppliesToLabel(value: OfferAppliesTo): string {
  return offerAppliesToOptions.find((option) => option.value === value)?.label ?? value;
}

export function pricingModeLabel(value: PricingMode): string {
  return value === "FLAT" ? "Flat rate" : "Per day";
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(value: string): string | null {
  if (value === "") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nullableNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}
