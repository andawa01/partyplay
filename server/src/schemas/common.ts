import { z } from "zod";

/** Slugs are kebab-case and are the public identifier for every catalogue resource. */
export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

export const slugParamsSchema = z.object({ slug: slugSchema });

/** Admin routes address rows by id, the same way the database does. */
export const idParamsSchema = z.object({ id: z.string().min(1).max(64) });
