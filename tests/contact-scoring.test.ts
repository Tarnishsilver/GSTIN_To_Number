import { describe, it, expect } from "vitest";
import { scoreContacts, getBaseConfidence, boostConfidenceForConsensus } from "../src/modules/scoring/contact-score";
import { BusinessCandidate } from "../src/modules/discovery/discovery.types";

describe("Contact Scoring", () => {
  it("should give high confidence for official website source", () => {
    const conf = getBaseConfidence("official_website");
    expect(conf).toBe(0.9);
  });

  it("should give highest confidence for official contact page", () => {
    const conf = getBaseConfidence("official_contact_page");
    expect(conf).toBe(0.95);
  });

  it("should give lower confidence for search result", () => {
    const conf = getBaseConfidence("search_result");
    expect(conf).toBe(0.5);
  });

  it("should boost confidence when multiple sources agree", () => {
    const candidates: BusinessCandidate[] = [
      {
        name: "ABC Tech",
        website: "https://www.example.com",
        phoneNumbers: ["+919876543210"],
        emails: ["info@example.com"],
        city: "Mumbai",
        source: "mock",
      },
      {
        name: "ABC Tech",
        website: "https://www.example.com",
        phoneNumbers: ["+919876543210"],
        emails: [],
        city: "Mumbai",
        source: "mock2",
      },
    ];

    const contacts = scoreContacts(candidates);
    const phones = contacts.filter((c) => c.type === "phone");

    expect(phones.length).toBe(1);
    expect(phones[0]!.confidence).toBeGreaterThan(0.85);
  });

  it("should handle conflicting phone numbers", () => {
    const candidates: BusinessCandidate[] = [
      {
        name: "ABC Tech",
        website: "https://www.example.com",
        phoneNumbers: ["+919876543210"],
        emails: [],
        source: "mock",
      },
      {
        name: "ABC Tech",
        website: "https://www.example.com",
        phoneNumbers: ["+919876543211"],
        emails: [],
        source: "mock2",
      },
    ];

    const contacts = scoreContacts(candidates);
    const phones = contacts.filter((c) => c.type === "phone");
    expect(phones.length).toBe(2);
  });
});
