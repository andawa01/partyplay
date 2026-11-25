import type { Request, Response } from "express";

import { reportExportQuerySchema, reportQuerySchema } from "../schemas/reports";
import * as reports from "../services/reports";

export async function getReport(req: Request, res: Response): Promise<void> {
  const query = reportQuerySchema.parse(req.query);
  res.json({ data: await reports.getReport(query) });
}

/** CSV is the one response that is not the `{ data }` envelope; the headers say so. */
export async function exportReport(req: Request, res: Response): Promise<void> {
  const query = reportExportQuerySchema.parse(req.query);
  const file =
    query.type === "bookings" ? await reports.bookingsCsv(query) : await reports.paymentsCsv(query);

  res
    .status(200)
    .type("text/csv")
    .setHeader("Content-Disposition", `attachment; filename="${file.filename}"`)
    .send(file.body);
}
