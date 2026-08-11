const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "throwaway.email",
]);

const FAKE_EMAILS = [
  "test@test.com",
  "example@example.com",
  "user@example.com",
  "noreply@",
  "no-reply@",
  "donotreply@",
];

export interface ExtractedEmail {
  email: string;
  normalized: string;
}

export function extractEmails(text: string): ExtractedEmail[] {
  const matches = text.match(EMAIL_REGEX) || [];
  const seen = new Set<string>();
  const results: ExtractedEmail[] = [];

  for (const match of matches) {
    const normalized = match.toLowerCase().trim();

    if (seen.has(normalized)) continue;

    const domain = normalized.split("@")[1];
    if (!domain) continue;

    if (DISPOSABLE_DOMAINS.has(domain)) continue;

    if (FAKE_EMAILS.some((fake) => normalized.includes(fake))) continue;

    seen.add(normalized);
    results.push({ email: match, normalized });
  }

  return results;
}
