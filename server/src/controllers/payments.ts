import type { Request, Response } from "express";

import { unauthorized } from "../lib/api-error";
import { idParamsSchema } from "../schemas/common";
import { createPaymentSchema, refundPaymentSchema, updatePaymentSchema } from "../schemas/payments";
import * as payments from "../services/payments";

function adminId(req: Request): string {
  const id = req.admin?.id;
  if (!id) {
    throw unauthorized("Authentication required");
  }
  return id;
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = createPaymentSchema.parse(req.body);
  res.status(201).json({ data: await payments.recordPayment(id, input, adminId(req)) });
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await payments.listPayments(id));
}

export async function deletePayment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  res.json({ data: await payments.deletePayment(id) });
}

export async function updatePayment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updatePaymentSchema.parse(req.body);
  res.json({ data: await payments.updatePayment(id, input) });
}

export async function refundPayment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = refundPaymentSchema.parse(req.body);
  res.status(201).json({ data: await payments.refundPayment(id, input, adminId(req)) });
}
