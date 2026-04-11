import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canGuestUseToday, getGuestTodayCount, markGuestUsedToday } from "../guest-daily-limit";

describe("guest-daily-limit", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    // 2026-03-12 12:00 JST (03:00 UTC)
    vi.setSystemTime(new Date("2026-03-12T03:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canGuestUseToday", () => {
    it("returns true when no usage recorded", () => {
      expect(canGuestUseToday("scanner")).toBe(true);
    });

    it("returns false after usage is recorded today", () => {
      markGuestUsedToday("scanner");
      expect(canGuestUseToday("scanner")).toBe(false);
    });

    it("returns true when usage is from a different day", () => {
      localStorage.setItem(
        "swimhub_guest_daily_usage_scanner",
        JSON.stringify({ date: "2026-03-11", count: 1 }),
      );
      expect(canGuestUseToday("scanner")).toBe(true);
    });

    it("isolates scanner and timer usage", () => {
      markGuestUsedToday("scanner");
      expect(canGuestUseToday("timer")).toBe(true);
    });
  });

  describe("markGuestUsedToday", () => {
    it("creates usage entry on first use", () => {
      markGuestUsedToday("scanner");
      expect(getGuestTodayCount("scanner")).toBe(1);
    });

    it("increments count on repeated use", () => {
      markGuestUsedToday("scanner");
      markGuestUsedToday("scanner");
      expect(getGuestTodayCount("scanner")).toBe(2);
    });

    it("resets count on new day", () => {
      markGuestUsedToday("scanner");
      // Move to next day
      vi.setSystemTime(new Date("2026-03-13T03:00:00Z"));
      markGuestUsedToday("scanner");
      expect(getGuestTodayCount("scanner")).toBe(1);
    });
  });

  describe("getGuestTodayCount", () => {
    it("returns 0 when no usage recorded", () => {
      expect(getGuestTodayCount("scanner")).toBe(0);
    });

    it("returns 0 when usage is from different day", () => {
      localStorage.setItem(
        "swimhub_guest_daily_usage_timer",
        JSON.stringify({ date: "2026-03-11", count: 3 }),
      );
      expect(getGuestTodayCount("timer")).toBe(0);
    });

    it("returns current count for today", () => {
      markGuestUsedToday("timer");
      markGuestUsedToday("timer");
      expect(getGuestTodayCount("timer")).toBe(2);
    });
  });
});
