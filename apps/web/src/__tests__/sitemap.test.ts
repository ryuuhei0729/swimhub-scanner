/**
 * Sprint Contract [C-1]〜[C-5]: scanner web sitemap 検証
 *
 * 検証観点:
 *   [C-1] sitemap() が 10 エントリを返す (supportedLocales 2 × 5 パス)
 *   [C-2] /en/* エントリが存在する
 *   [C-3] priority 値が仕様通りである
 *         - /ja (トップ): 1
 *         - /en (トップ): 0.9 (/ja と同値扱いは PM 判断により 0.9 以上で OK)
 *         - /{locale}/login: 0.7
 *         - /{locale}/privacy: 0.3
 *         - /{locale}/terms: 0.3
 *         - /{locale}/support: 0.5
 *   [C-4] /settings は sitemap 対象外 (PM 判断: 除外確定)
 *   [C-5] tsc --noEmit は CI audit で確認
 *
 * 注意: next build は CI audit で別途確認
 */

import { describe, it, expect, beforeEach } from "vitest";
import sitemap from "@/app/sitemap";
import type { MetadataRoute } from "next";

const BASE_URL = "https://scanner.swim-hub.app";

describe("scanner web sitemap", () => {
  let entries: MetadataRoute.Sitemap;

  beforeEach(() => {
    entries = sitemap();
  });

  // [C-1] エントリ数の検証
  describe("[C-1] エントリ数", () => {
    it("ロケール 2 × パス 5 で合計 10 エントリを返す", () => {
      expect(entries).toHaveLength(10);
    });
  });

  // [C-2] /en/* エントリの存在確認
  describe("[C-2] /en/* エントリ", () => {
    it("/en (トップ) エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/en`);
    });

    it("/en/login エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/en/login`);
    });

    it("/en/privacy エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/en/privacy`);
    });

    it("/en/terms エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/en/terms`);
    });

    it("/en/support エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/en/support`);
    });
  });

  // /ja/* エントリの存在確認
  describe("[C-2-ja] /ja/* エントリ", () => {
    it("/ja (トップ) エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/ja`);
    });

    it("/ja/login エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/ja/login`);
    });

    it("/ja/privacy エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/ja/privacy`);
    });

    it("/ja/terms エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/ja/terms`);
    });

    it("/ja/support エントリが存在する", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${BASE_URL}/ja/support`);
    });
  });

  // [C-3] priority 値の検証
  describe("[C-3] priority 値", () => {
    it("/ja (トップ) の priority が 1 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(1);
    });

    it("/en (トップ) の priority が 0.9 である (PM 判断: /ja と同値扱い)", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/en`);
      expect(entry).toBeDefined();
      // PM 判断: /en と /ja の priority は同値。実装は 0.9 で acceptable
      expect(entry?.priority).toBeGreaterThanOrEqual(0.9);
    });

    it("/ja/login の priority が 0.7 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/login`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.7);
    });

    it("/en/login の priority が 0.7 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/en/login`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.7);
    });

    it("/ja/privacy の priority が 0.3 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/privacy`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.3);
    });

    it("/en/privacy の priority が 0.3 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/en/privacy`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.3);
    });

    it("/ja/terms の priority が 0.3 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/terms`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.3);
    });

    it("/en/terms の priority が 0.3 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/en/terms`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.3);
    });

    it("/ja/support の priority が 0.5 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/support`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.5);
    });

    it("/en/support の priority が 0.5 である", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/en/support`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.5);
    });
  });

  // [C-4] /settings は sitemap 対象外
  describe("[C-4] /settings は対象外 (PM 判断)", () => {
    it("/ja/settings エントリが存在しない", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).not.toContain(`${BASE_URL}/ja/settings`);
    });

    it("/en/settings エントリが存在しない", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).not.toContain(`${BASE_URL}/en/settings`);
    });

    it("settings を含む URL が一切ない", () => {
      const settingsEntries = entries.filter((e) => e.url.includes("settings"));
      expect(settingsEntries).toHaveLength(0);
    });
  });

  // changeFrequency の確認 (仕様の一部)
  describe("changeFrequency 値", () => {
    it("トップページは 'monthly'", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja`);
      expect(entry?.changeFrequency).toBe("monthly");
    });

    it("login は 'monthly'", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/login`);
      expect(entry?.changeFrequency).toBe("monthly");
    });

    it("privacy は 'yearly'", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/privacy`);
      expect(entry?.changeFrequency).toBe("yearly");
    });

    it("terms は 'yearly'", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/terms`);
      expect(entry?.changeFrequency).toBe("yearly");
    });

    it("support は 'monthly'", () => {
      const entry = entries.find((e) => e.url === `${BASE_URL}/ja/support`);
      expect(entry?.changeFrequency).toBe("monthly");
    });
  });

  // lastModified が Date オブジェクトであること
  describe("lastModified", () => {
    it("全エントリに lastModified が Date オブジェクトで設定される", () => {
      for (const entry of entries) {
        expect(entry.lastModified).toBeInstanceOf(Date);
      }
    });
  });
});
