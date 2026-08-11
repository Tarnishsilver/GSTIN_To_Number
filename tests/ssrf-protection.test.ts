import { describe, it, expect } from "vitest";
import { validateUrl, isAllowedUrl } from "../src/modules/crawler/ssrf-protection";

describe("SSRF Protection", () => {
  it("should allow valid public URLs", () => {
    expect(isAllowedUrl("https://example.com")).toBe(true);
    expect(isAllowedUrl("https://www.google.com")).toBe(true);
    expect(isAllowedUrl("http://example.in/contact")).toBe(true);
  });

  it("should block localhost", () => {
    expect(isAllowedUrl("http://localhost:3000")).toBe(false);
    expect(isAllowedUrl("https://localhost")).toBe(false);
    expect(isAllowedUrl("http://127.0.0.1")).toBe(false);
  });

  it("should block 0.0.0.0", () => {
    expect(isAllowedUrl("http://0.0.0.0:8080")).toBe(false);
  });

  it("should block private IP ranges", () => {
    expect(isAllowedUrl("http://10.0.0.1")).toBe(false);
    expect(isAllowedUrl("http://192.168.1.1")).toBe(false);
    expect(isAllowedUrl("http://172.16.0.1")).toBe(false);
  });

  it("should block non-HTTP protocols", () => {
    expect(isAllowedUrl("ftp://example.com")).toBe(false);
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
  });

  it("should throw for invalid URLs", () => {
    expect(() => validateUrl("not-a-url")).toThrow();
  });

  it("should block metadata.google.internal", () => {
    expect(isAllowedUrl("http://metadata.google.internal")).toBe(false);
  });
});
