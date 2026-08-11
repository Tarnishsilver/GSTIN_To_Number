import { NormalizedPhone } from "./phone-normalizer";
import { ExtractedEmail } from "./email-extractor";

export function deduplicatePhones(
  phones: NormalizedPhone[]
): NormalizedPhone[] {
  const seen = new Map<string, NormalizedPhone>();

  for (const phone of phones) {
    const existing = seen.get(phone.e164);
    if (!existing) {
      seen.set(phone.e164, phone);
    }
  }

  return Array.from(seen.values());
}

export function deduplicateEmails(
  emails: ExtractedEmail[]
): ExtractedEmail[] {
  const seen = new Map<string, ExtractedEmail>();

  for (const email of emails) {
    if (!seen.has(email.normalized)) {
      seen.set(email.normalized, email);
    }
  }

  return Array.from(seen.values());
}
