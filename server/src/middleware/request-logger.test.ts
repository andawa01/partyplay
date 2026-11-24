import { EventEmitter } from "node:events";

import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestLogger } from "./request-logger";

const originalNodeEnv = process.env.NODE_ENV;
const originalLogRequests = process.env.LOG_REQUESTS;

function logRequest(path: string, statusCode = 200): void {
  const req = { originalUrl: path, method: "GET", id: "request-1" } as unknown as Request;
  const res = new EventEmitter() as unknown as Response & EventEmitter;
  Object.defineProperty(res, "statusCode", { value: statusCode });

  const next = vi.fn() as unknown as NextFunction;
  requestLogger(req, res, next);
  expect(next).toHaveBeenCalledOnce();
  res.emit("finish");
}

describe("requestLogger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.LOG_REQUESTS = "true";
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalLogRequests === undefined) {
      delete process.env.LOG_REQUESTS;
    } else {
      process.env.LOG_REQUESTS = originalLogRequests;
    }
  });

  it("logs the full path without the query string", () => {
    logRequest("/api/categories?q=customer-phone");

    expect(logSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(logSpy.mock.calls[0]?.[0] as string) as { path: string };
    expect(entry.path).toBe("/api/categories");
  });

  it("skips successful health checks but logs failed ones", () => {
    logRequest("/api/health");
    expect(logSpy).not.toHaveBeenCalled();

    logRequest("/api/health", 503);
    expect(logSpy).toHaveBeenCalledOnce();
  });
});
