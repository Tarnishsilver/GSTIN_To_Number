import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public isNotRetryable: boolean = true
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error & { type?: string; status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(
      {
        requestId: req.requestId,
        statusCode: err.statusCode,
        code: err.code,
        error: err.message,
      },
      "AppError handled"
    );
    res.status(err.statusCode).json({
      error: {
        code: err.code || "ERROR",
        message: err.message,
      },
    });
    return;
  }

  if (err.type === "entity.parse.failed" || (err as any).status === 400) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
      },
    });
    return;
  }

  if (err.name === "ZodError") {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.message,
      },
    });
    return;
  }

  logger.error(
    { requestId: req.requestId, err },
    "Unhandled error"
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
