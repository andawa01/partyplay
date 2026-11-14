import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Forwards a rejected promise to the error middleware. Express 5 does this on its own,
 * but being explicit keeps the intent visible at the route and means a handler that
 * throws inside a non-awaited callback still ends up in one place.
 */
export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
