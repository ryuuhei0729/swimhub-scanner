import { afterEach, describe, expect, it, vi } from "vitest";
import { getTodayJST } from "../date";

describe("getTodayJST", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns date in YYYY-MM-DD format", () => {
    const result = getTodayJST();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns JST date for a known UTC time", () => {
    // 2026-03-15 23:00 UTC = 2026-03-16 08:00 JST
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T23:00:00Z"));
    expect(getTodayJST()).toBe("2026-03-16");
  });

  it("returns same date when UTC and JST are on the same day", () => {
    // 2026-06-01 10:00 UTC = 2026-06-01 19:00 JST
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    expect(getTodayJST()).toBe("2026-06-01");
  });
});
