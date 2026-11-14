import type { Request, Response } from "express";

import { authConfig, sessionCookieMaxAgeMs, sessionCookieOptions } from "../config/auth";
import { unauthorized } from "../lib/api-error";
import { changePasswordSchema, loginSchema } from "../schemas/auth";
import * as auth from "../services/auth";

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const { admin, token } = await auth.login(input);

  res.cookie(authConfig.cookieName, token, {
    ...sessionCookieOptions,
    maxAge: sessionCookieMaxAgeMs,
  });
  res.json({ data: admin });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(authConfig.cookieName, sessionCookieOptions);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  const admin = req.admin;
  if (!admin) {
    throw unauthorized("Authentication required");
  }
  res.json({ data: admin });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const admin = req.admin;
  if (!admin) {
    throw unauthorized("Authentication required");
  }

  const input = changePasswordSchema.parse(req.body);
  await auth.changePassword(admin.id, input);
  res.status(204).send();
}
