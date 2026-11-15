import type { Request, Response } from "express";

import * as dashboard from "../services/dashboard";

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  res.json({ data: await dashboard.getDashboard() });
}
