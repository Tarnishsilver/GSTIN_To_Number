import { describe, it, expect } from "vitest";
import {
  normalizeIndianPhoneNumber,
  extractPhoneNumbers,
} from "../src/modules/contacts/phone-normalizer";

describe("Phone Number Normalization", () => {
  it("should normalize +91 98765 43210", () => {
    const result = normalizeIndianPhoneNumber("+91 98765 43210");
    expect(result).not.toBeNull();
    expect(result!.e164).toBe("+919876543210");
    expect(result!.isMobile).toBe(true);
  });

  it("should normalize +91-9876543210", () => {
    const result = normalizeIndianPhoneNumber("+91-9876543210");
    expect(result).not.toBeNull();
    expect(result!.e164).toBe("+919876543210");
  });

  it("should normalize 09876543210", () => {
    const result = normalizeIndianPhoneNumber("09876543210");
    expect(result).not.toBeNull();
    expect(result!.e164).toBe("+919876543210");
  });

  it("should normalize 9876543210", () => {
    const result = normalizeIndianPhoneNumber("9876543210");
    expect(result).not.toBeNull();
    expect(result!.e164).toBe("+919876543210");
  });

  it("should normalize 0919876543210", () => {
    const result = normalizeIndianPhoneNumber("0919876543210");
    expect(result).not.toBeNull();
    expect(result!.e164).toBe("+919876543210");
  });

  it("should reject GST numbers as phone numbers", () => {
    const result = normalizeIndianPhoneNumber("27ABCDE1234F1Z5");
    expect(result).toBeNull();
  });

  it("should reject PAN numbers as phone numbers", () => {
    const result = normalizeIndianPhoneNumber("ABCDE1234F");
    expect(result).toBeNull();
  });

  it("should reject 6-digit PIN codes as phone numbers", () => {
    const result = normalizeIndianPhoneNumber("400093");
    expect(result).toBeNull();
  });

  it("should reject 5-digit numbers", () => {
    const result = normalizeIndianPhoneNumber("12345");
    expect(result).toBeNull();
  });

  it("should reject numbers not starting with valid digit", () => {
    const result = normalizeIndianPhoneNumber("0123456789");
    expect(result).toBeNull();
  });

  it("should reject all-same-digit numbers", () => {
    const result = normalizeIndianPhoneNumber("9999999999");
    expect(result).toBeNull();
  });

  it("should handle landline format", () => {
    const result = normalizeIndianPhoneNumber("02212345678");
    expect(result).not.toBeNull();
    expect(result!.isMobile).toBe(false);
  });
});

describe("Phone Number Extraction", () => {
  it("should extract phone numbers from text", () => {
    const text =
      "Call us at +91 98765 43210 or 022-1234-5678 for support";
    const phones = extractPhoneNumbers(text);
    expect(phones.length).toBeGreaterThanOrEqual(1);
  });

  it("should not extract PIN codes as phone numbers", () => {
    const text = "Our pincode is 400093 and phone is +91 9876543210";
    const phones = extractPhoneNumbers(text);
    const hasPincode = phones.some((p) => p.e164 === "+91400093");
    expect(hasPincode).toBe(false);
  });
});
