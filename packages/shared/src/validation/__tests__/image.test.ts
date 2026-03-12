import { describe, expect, it } from "vitest";
import {
  estimateBase64Size,
  validateImageMimeType,
  validateImageSize,
} from "../image";

describe("validateImageMimeType", () => {
  it("accepts image/jpeg", () => {
    expect(validateImageMimeType("image/jpeg")).toEqual({ valid: true });
  });

  it("accepts image/png", () => {
    expect(validateImageMimeType("image/png")).toEqual({ valid: true });
  });

  it("rejects image/gif", () => {
    const result = validateImageMimeType("image/gif");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects image/webp", () => {
    const result = validateImageMimeType("image/webp");
    expect(result.valid).toBe(false);
  });

  it("rejects empty string", () => {
    const result = validateImageMimeType("");
    expect(result.valid).toBe(false);
  });

  it("rejects application/pdf", () => {
    const result = validateImageMimeType("application/pdf");
    expect(result.valid).toBe(false);
  });
});

describe("validateImageSize", () => {
  it("accepts size under 10MB", () => {
    expect(validateImageSize(5 * 1024 * 1024)).toEqual({ valid: true });
  });

  it("accepts exactly 10MB", () => {
    expect(validateImageSize(10 * 1024 * 1024)).toEqual({ valid: true });
  });

  it("rejects size over 10MB", () => {
    const result = validateImageSize(10 * 1024 * 1024 + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts zero bytes", () => {
    expect(validateImageSize(0)).toEqual({ valid: true });
  });

  it("accepts 1 byte", () => {
    expect(validateImageSize(1)).toEqual({ valid: true });
  });
});

describe("estimateBase64Size", () => {
  it("estimates size from raw base64 string", () => {
    // 4 base64 chars = 3 bytes
    const base64 = "AAAA";
    expect(estimateBase64Size(base64)).toBe(3);
  });

  it("strips data URI prefix before estimating", () => {
    const base64WithPrefix = "data:image/jpeg;base64,AAAA";
    expect(estimateBase64Size(base64WithPrefix)).toBe(3);
  });

  it("handles longer base64 strings", () => {
    // 100 chars => ceil(100 * 3 / 4) = 75 bytes
    const base64 = "A".repeat(100);
    expect(estimateBase64Size(base64)).toBe(75);
  });

  it("handles empty string after prefix", () => {
    const base64 = "data:image/png;base64,";
    expect(estimateBase64Size(base64)).toBe(0);
  });
});
