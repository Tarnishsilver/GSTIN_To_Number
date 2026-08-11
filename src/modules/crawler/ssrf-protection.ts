import { URL } from "url";
import { logger } from "../../utils/logger";

const PRIVATE_RANGES = [
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^224\./,
  /^240\./,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
  /^::1$/,
  /^::$/,
];

const BLOCKED_HOSTS = [
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "[::]",
  "metadata.google.internal",
];

export class SSRFProtectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSRFProtectionError";
  }
}

export function validateUrl(raw: string): URL {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new SSRFProtectionError(`Invalid URL: ${raw}`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new SSRFProtectionError(`Blocked protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new SSRFProtectionError(`Blocked host: ${hostname}`);
  }

  if (hostname.includes("127.0.0.1") || hostname.includes("0.0.0.0")) {
    throw new SSRFProtectionError(`Blocked host: ${hostname}`);
  }

  for (const range of PRIVATE_RANGES) {
    if (range.test(hostname)) {
      throw new SSRFProtectionError(`Blocked private IP range: ${hostname}`);
    }
  }

  return url;
}

export function isAllowedUrl(raw: string): boolean {
  try {
    validateUrl(raw);
    return true;
  } catch {
    return false;
  }
}
