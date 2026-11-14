import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "../lib/api-error";

declare global {
  namespace Express {
    interface Request {
      /** Correlation id, echoed in the response header and in 500 responses. */
      id?: string;
    }
  }
}

const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/** Gives every request an id, reusing a well-formed one from the caller. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(REQUEST_ID_HEADER);
  req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}

/** Turns any unmatched `/api/*` request into the standard 404 envelope. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, "ROUTE_NOT_FOUND", `No route matches ${req.method} ${req.originalUrl}`));
}

/**
 * The single exit for failures. Order matters: known error types are mapped to their
 * status, and anything unrecognised becomes a 500 whose details are logged, never sent.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // A response that already started cannot be replaced with JSON; let Express close it.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Invalid input",
      code: "VALIDATION_ERROR",
      details: error.flatten(),
    });
    return;
  }

  if (isJsonParseError(error)) {
    res.status(400).json({ error: "Malformed JSON body", code: "INVALID_JSON" });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      res.status(mapped.status).json({
        error: mapped.message,
        code: mapped.code,
        ...(mapped.details === undefined ? {} : { details: mapped.details }),
      });
      return;
    }
  }

  const id = req.id ?? "unknown";
  console.error(`[${id}] Unhandled error on ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({
    error: "Something went wrong",
    code: "INTERNAL_ERROR",
    details: { requestId: id },
  });
}

function isJsonParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    (error as SyntaxError & { type?: string }).type === "entity.parse.failed"
  );
}

interface MappedPrismaError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): MappedPrismaError | undefined {
  switch (error.code) {
    case "P2002": {
      const fields = uniqueTargetFields(error);
      return {
        status: 409,
        code: "DUPLICATE_VALUE",
        message: fields.length
          ? `A record with this ${fields.join(", ")} already exists`
          : "A record with these values already exists",
        details: fields.length ? { fields } : undefined,
      };
    }
    case "P2025":
      return { status: 404, code: "NOT_FOUND", message: "Resource not found" };
    case "P2003":
      return {
        status: 409,
        code: "REFERENCE_CONFLICT",
        message: "This record is still referenced by other records",
      };
    default:
      return undefined;
  }
}

/** Prisma reports `meta.target` as a string in some drivers and an array in others. */
function uniqueTargetFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target: unknown = error.meta?.target;
  if (Array.isArray(target)) {
    return target.filter((field): field is string => typeof field === "string");
  }
  return typeof target === "string" ? [target] : [];
}
