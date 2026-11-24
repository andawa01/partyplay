import { z } from "zod";

/** Kenyan numbers are stored in local format, exactly 10 digits (e.g. 0712345678). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone number must be exactly 10 digits");

/** Trim and normalise email addresses before they reach a unique database column. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

/** Slugs are kebab-case and are the public identifier for every catalogue resource. */
export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

export const imagePublicIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9/_-]*$/, "Invalid image reference");

export const slugParamsSchema = z.object({ slug: slugSchema });

/** Admin routes address rows by id, the same way the database does. */
export const idParamsSchema = z.object({ id: z.string().min(1).max(64) });
