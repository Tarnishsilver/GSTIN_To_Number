import { describe, it, expect } from "vitest";
import { validateGSTIN } from "../src/modules/gst/gst.validator";

describe("GSTIN Validator", () => {
  it("should validate a correct GSTIN", () => {
    const result = validateGSTIN("27ABCDE1234F1Z0");
    expect(result.valid).toBe(true);
    expect(result.normalizedGSTIN).toBe("27ABCDE1234F1Z0");
  });

  it("should trim whitespace", () => {
    const result = validateGSTIN("  27ABCDE1234F1Z0  ");
    expect(result.valid).toBe(true);
    expect(result.normalizedGSTIN).toBe("27ABCDE1234F1Z0");
  });

  it("should convert to uppercase", () => {
    const result = validateGSTIN("27abcde1234f1z0");
    expect(result.valid).toBe(true);
    expect(result.normalizedGSTIN).toBe("27ABCDE1234F1Z0");
  });

  it("should reject GSTIN with wrong length", () => {
    const result = validateGSTIN("27ABCDE1234F1Z");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("15 characters");
  });

  it("should reject GSTIN with invalid characters", () => {
    const result = validateGSTIN("27ABCDE1234F1@@");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("character structure");
  });

  it("should reject GSTIN with invalid checksum", () => {
    const result = validateGSTIN("27ABCDE1234F1Z6");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("checksum");
  });

  it("should reject empty string", () => {
    const result = validateGSTIN("");
    expect(result.valid).toBe(false);
  });

  it("should reject GSTIN with invalid state code (00)", () => {
    const result = validateGSTIN("00ABCDE1234F1Z5");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("state code");
  });
});
