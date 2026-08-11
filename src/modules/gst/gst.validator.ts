import { GSTINValidationResult } from "./gst.types";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const CHAR_MAP = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function getCharValue(ch: string): number {
  const idx = CHAR_MAP.indexOf(ch);
  if (idx === -1) return 0;
  return idx;
}

function validateChecksum(gstin: string): boolean {
  let factor = 2;
  let sum = 0;

  for (let i = gstin.length - 2; i >= 0; i--) {
    const ch = gstin[i]!;
    const codePoint = ch.codePointAt(0) ?? 0;

    let num: number;
    if (codePoint >= 48 && codePoint <= 57) {
      num = codePoint - 48;
    } else if (codePoint >= 65 && codePoint <= 90) {
      num = codePoint - 55;
    } else {
      return false;
    }

    num *= factor;
    factor = factor === 2 ? 1 : 2;

    const quotient = Math.floor(num / 36);
    const remainder = num % 36;
    sum += quotient + remainder;
  }

  const checkSum = (36 - (sum % 36)) % 36;
  const checkChar = CHAR_MAP[checkSum];
  const lastChar = gstin[gstin.length - 1];

  return checkChar === lastChar;
}

export function validateGSTIN(input: string): GSTINValidationResult {
  const trimmed = input.trim().toUpperCase();

  if (trimmed.length !== 15) {
    return {
      valid: false,
      error: `GSTIN must be 15 characters, got ${trimmed.length}`,
    };
  }

  if (!GSTIN_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "GSTIN has invalid character structure",
    };
  }

  const stateCode = parseInt(trimmed.substring(0, 2), 10);
  if (stateCode < 1 || stateCode > 37) {
    return {
      valid: false,
      error: `Invalid state code: ${trimmed.substring(0, 2)}`,
    };
  }

  if (!validateChecksum(trimmed)) {
    return {
      valid: false,
      error: "GSTIN checksum mismatch",
    };
  }

  return {
    valid: true,
    normalizedGSTIN: trimmed,
  };
}
