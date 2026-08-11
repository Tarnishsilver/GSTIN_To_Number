import { describe, it, expect } from "vitest";
import { calculateBusinessMatchScore } from "../src/modules/scoring/identity-score";
import { GSTBusinessDetails } from "../src/modules/gst/gst.types";
import { BusinessCandidate } from "../src/modules/discovery/discovery.types";

describe("Entity Resolution", () => {
  const baseGSTBusiness: GSTBusinessDetails = {
    gstin: "27ABCDE1234F1Z5",
    legalName: "ABC Technologies Private Limited",
    tradeName: "ABC Tech",
    registrationStatus: "Active",
    registrationDate: "2019-06-15",
    businessType: "Private Limited Company",
    address: {
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400093",
    },
    source: "mock",
    fetchedAt: new Date(),
  };

  it("should give high score for exact name match", () => {
    const candidate: BusinessCandidate = {
      name: "ABC Technologies Pvt Ltd",
      city: "Mumbai",
      state: "Maharashtra",
      phoneNumbers: [],
      emails: [],
      source: "mock",
    };
    const score = calculateBusinessMatchScore(baseGSTBusiness, candidate);
    expect(score).toBeGreaterThan(0.5);
  });

  it("should handle Pvt Ltd vs Private Limited", () => {
    const candidate: BusinessCandidate = {
      name: "ABC Technologies Pvt. Ltd.",
      city: "Mumbai",
      phoneNumbers: [],
      emails: [],
      source: "mock",
    };
    const score = calculateBusinessMatchScore(baseGSTBusiness, candidate);
    expect(score).toBeGreaterThan(0.4);
  });

  it("should give high score for matching city, state, pincode", () => {
    const candidate: BusinessCandidate = {
      name: "ABC Tech Solutions",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400093",
      phoneNumbers: [],
      emails: [],
      source: "mock",
    };
    const score = calculateBusinessMatchScore(baseGSTBusiness, candidate);
    expect(score).toBeGreaterThan(0.3);
  });

  it("should give low score for completely different company", () => {
    const candidate: BusinessCandidate = {
      name: "XYZ Manufacturing Co",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      phoneNumbers: [],
      emails: [],
      source: "mock",
    };
    const score = calculateBusinessMatchScore(baseGSTBusiness, candidate);
    expect(score).toBeLessThan(0.3);
  });

  it("should give lower score when city mismatches", () => {
    const candidate: BusinessCandidate = {
      name: "ABC Technologies Pvt Ltd",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      phoneNumbers: [],
      emails: [],
      source: "mock",
    };
    const score = calculateBusinessMatchScore(baseGSTBusiness, candidate);
    expect(score).toBeLessThan(0.7);
  });

  it("should boost score when website matches company name", () => {
    const candidate: BusinessCandidate = {
      name: "ABC Technologies Pvt Ltd",
      website: "https://www.abctechnologies.com",
      city: "Mumbai",
      phoneNumbers: [],
      emails: [],
      source: "mock",
    };
    const score = calculateBusinessMatchScore(baseGSTBusiness, candidate);
    expect(score).toBeGreaterThan(0.5);
  });
});
