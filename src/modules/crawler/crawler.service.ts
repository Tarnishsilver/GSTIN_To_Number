import { validateUrl } from "./ssrf-protection";
import { extractPhoneNumbers, normalizeIndianPhoneNumber } from "../contacts/phone-normalizer";
import { extractEmails } from "../contacts/email-extractor";
import { logger } from "../../utils/logger";

const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/company",
  "/",
];

export interface WebsiteContacts {
  phones: string[];
  emails: string[];
  website: string;
  contactPageUrl?: string;
}

export async function discoverWebsiteContacts(
  url: string
): Promise<WebsiteContacts | null> {
  const baseUrl = validateUrl(url);

  const contacts: WebsiteContacts = {
    phones: [],
    emails: [],
    website: baseUrl.origin,
  };

  const visited = new Set<string>();
  const texts: string[] = [];

  for (const path of CONTACT_PATHS) {
    const pageUrl = new URL(path, baseUrl.origin).href;

    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    try {
      const text = await fetchPageText(pageUrl);
      if (text) {
        texts.push(text);
        contacts.contactPageUrl = pageUrl;
      }
    } catch (error) {
      logger.debug({ url: pageUrl, err: error }, "Failed to fetch page");
    }
  }

  for (const text of texts) {
    const phones = extractPhoneNumbers(text);
    for (const p of phones) {
      if (!contacts.phones.includes(p.e164)) {
        contacts.phones.push(p.e164);
      }
    }

    const emails = extractEmails(text);
    for (const e of emails) {
      if (!contacts.emails.includes(e.normalized)) {
        contacts.emails.push(e.normalized);
      }
    }

    const mailtoMatches = text.match(/mailto:([^\s"'<>]+)/gi) || [];
    for (const match of mailtoMatches) {
      const email = match.replace("mailto:", "").trim();
      const normalized = email.toLowerCase();
      if (!contacts.emails.includes(normalized)) {
        contacts.emails.push(normalized);
      }
    }

    const telMatches = text.match(/tel:([+\d][\d\s-]*)/gi) || [];
    for (const match of telMatches) {
      const raw = match.replace("tel:", "").trim();
      const normalized = normalizeIndianPhoneNumber(raw);
      if (normalized && !contacts.phones.includes(normalized.e164)) {
        contacts.phones.push(normalized.e164);
      }
    }

    const waMatches = text.match(/wa\.me\/(\d+)/gi) || [];
    for (const match of waMatches) {
      const digits = match.replace(/wa\.me\//, "");
      const normalized = normalizeIndianPhoneNumber(`+91${digits}`);
      if (normalized && !contacts.phones.includes(normalized.e164)) {
        contacts.phones.push(normalized.e164);
      }
    }
  }

  return contacts;
}

async function fetchPageText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "GSTIN-Contact-Discovery/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
