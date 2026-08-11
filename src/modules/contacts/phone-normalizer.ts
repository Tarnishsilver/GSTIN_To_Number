export interface NormalizedPhone {
  e164: string;
  national: string;
  isMobile: boolean;
  countryCode: string;
}

const PHONE_PATTERNS = [
  /(\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}/g,
  /(\+91[\s-]?)?0?[6789]\d{9}/g,
  /\+91[\s-]?\d{10}/g,
  /(\+91[\s-]?)?[2-6]\d{2}[\s-]?\d{3}[\s-]?\d{4}/g,
];

const FAKE_PATTERNS = [
  /^[6789]123456789$/,
  /^[6789]000000000$/,
  /^[6789]{10}$/,
];

const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PINCODE_PATTERN = /^[0-9]{6}$/;

function isFalsePositive(raw: string): boolean {
  const cleaned = raw.replace(/\D/g, "");

  if (cleaned.length < 10 || cleaned.length > 14) {
    return true;
  }

  if (GST_PATTERN.test(raw)) return true;
  if (PAN_PATTERN.test(raw)) return true;
  if (PINCODE_PATTERN.test(cleaned)) return true;

  for (const pattern of FAKE_PATTERNS) {
    if (pattern.test(cleaned)) return true;
  }

  if (/^(\d)\1{9}$/.test(cleaned)) return true;

  if (cleaned.length === 10 && !/^[6789]/.test(cleaned)) return true;

  return false;
}

export function normalizeIndianPhoneNumber(
  raw: string
): NormalizedPhone | null {
  const trimmed = raw.trim();

  if (isFalsePositive(trimmed)) return null;

  const cleaned = trimmed.replace(/[\s\-.()]/g, "");

  let digits = cleaned.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("91")) {
    digits = digits.substring(2);
  } else if (digits.length === 13 && digits.startsWith("091")) {
    digits = digits.substring(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.substring(2);
  } else if (digits.length === 12 && digits.startsWith("091")) {
    digits = digits.substring(3);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  if (digits.length !== 10) return null;

  if (!/^[6789]/.test(digits.substring(0, 1)) && !/^[2-6]/.test(digits.substring(0, 1))) {
    return null;
  }

  const isMobile = /^[6789]/.test(digits.substring(0, 1));

  return {
    e164: `+91${digits}`,
    national: `0${digits}`,
    isMobile,
    countryCode: "+91",
  };
}

export function extractPhoneNumbers(text: string): NormalizedPhone[] {
  const found = new Set<string>();
  const results: NormalizedPhone[] = [];

  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      const normalized = normalizeIndianPhoneNumber(match);
      if (normalized && !found.has(normalized.e164)) {
        found.add(normalized.e164);
        results.push(normalized);
      }
    }
  }

  return results;
}
