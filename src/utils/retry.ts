import { logger } from "./logger";

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 2000,
    maxDelayMs = 30000,
    shouldRetry = defaultShouldRetry,
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelayMs
      );

      logger.warn(
        { attempt, maxAttempts, delayMs: Math.round(delay), err: error },
        "Retrying after failure"
      );

      await sleep(delay);
    }
  }

  throw new Error("Unreachable");
}

function defaultShouldRetry(error: any): boolean {
  if (error?.status && [400, 401, 403].includes(error.status)) return false;
  if (error?.isNotRetryable) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
