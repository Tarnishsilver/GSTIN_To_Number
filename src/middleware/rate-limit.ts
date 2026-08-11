import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./error-handler";

const ipHits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipHits) {
    if (now >= entry.resetAt) {
      ipHits.delete(key);
    }
  }
}, 60000).unref();

export function rateLimit(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW * 1000;

  let entry = ipHits.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    ipHits.set(ip, entry);
  }

  entry.count++;

  if (entry.count > env.RATE_LIMIT_MAX) {
    next(new AppError(429, "Too many requests. Please try again later.", "RATE_LIMITED"));
    return;
  }

  next();
}
