import { describe, it, expect } from "vitest";
import { extractEmails } from "../src/modules/contacts/email-extractor";

describe("Email Extraction", () => {
  it("should extract email addresses from text", () => {
    const text = "Contact us at info@example.com or sales@company.in";
    const emails = extractEmails(text);
    expect(emails.length).toBe(2);
  });

  it("should deduplicate emails", () => {
    const text = "info@example.com info@example.com";
    const emails = extractEmails(text);
    expect(emails.length).toBe(1);
  });

  it("should exclude disposable emails", () => {
    const text = "temp@mailinator.com";
    const emails = extractEmails(text);
    expect(emails.length).toBe(0);
  });

  it("should extract emails from mailto links", () => {
    const text = '<a href="mailto:support@example.com">Email us</a>';
    const emails = extractEmails(text);
    expect(emails.length).toBe(1);
    expect(emails[0]!.normalized).toBe("support@example.com");
  });
});
