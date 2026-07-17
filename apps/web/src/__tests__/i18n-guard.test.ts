/**
 * Sprint Contract Task Y: i18n 3アプリ一貫性 — scanner 側検証
 *
 * 検証観点:
 *   [Y-1] @swimhub-scanner/i18n から DEVICE_FALLBACK_LOCALE が import できる
 *   [Y-3] @swimhub-scanner/i18n から isSupportedLocale が import できる
 *
 * isSupportedLocale の仕様:
 *   - "ja" / "en" / "zh" / "ko" / "de" → true
 *   - それ以外の文字列 / 大文字 / 空文字 / null / undefined / 数値 → false
 *   - region タグ付き ("zh-CN" 等) → false (languageCode 単体のみ対応)
 *   - TypeScript 型ガード (value is SupportedLocale) として機能する
 *
 * DEVICE_FALLBACK_LOCALE の仕様:
 *   - PM 決定事項: "en" であること
 */

import { describe, it, expect } from "vitest";
import {
  isSupportedLocale,
  DEVICE_FALLBACK_LOCALE,
  type SupportedLocale,
} from "@swimhub-scanner/i18n";

describe("isSupportedLocale", () => {
  describe("サポート対象ロケールは true を返す", () => {
    it('isSupportedLocale("ja") → true', () => {
      expect(isSupportedLocale("ja")).toBe(true);
    });
    it('isSupportedLocale("en") → true', () => {
      expect(isSupportedLocale("en")).toBe(true);
    });
    it('isSupportedLocale("zh") → true', () => {
      expect(isSupportedLocale("zh")).toBe(true);
    });
    it('isSupportedLocale("ko") → true', () => {
      expect(isSupportedLocale("ko")).toBe(true);
    });
    it('isSupportedLocale("de") → true', () => {
      expect(isSupportedLocale("de")).toBe(true);
    });
  });

  describe("サポート外の値は false を返す", () => {
    it('isSupportedLocale("fr") → false', () => {
      expect(isSupportedLocale("fr")).toBe(false);
    });
    it('isSupportedLocale("JA") → false (大文字)', () => {
      expect(isSupportedLocale("JA")).toBe(false);
    });
    it('isSupportedLocale("EN") → false (大文字)', () => {
      expect(isSupportedLocale("EN")).toBe(false);
    });
  });

  describe("境界値・型ガード", () => {
    it('isSupportedLocale("") → false (空文字)', () => {
      expect(isSupportedLocale("")).toBe(false);
    });
    it("isSupportedLocale(null) → false", () => {
      expect(isSupportedLocale(null)).toBe(false);
    });
    it("isSupportedLocale(undefined) → false", () => {
      expect(isSupportedLocale(undefined)).toBe(false);
    });
    it("isSupportedLocale(123) → false (数値)", () => {
      expect(isSupportedLocale(123)).toBe(false);
    });
    it("型ガードとして機能する (value is SupportedLocale)", () => {
      const v: unknown = "ja";
      if (isSupportedLocale(v)) {
        // TypeScript 型推論で SupportedLocale になることを確認
        const _check: SupportedLocale = v;
        expect(_check).toBe("ja");
      } else {
        // ここには来ないはず
        expect.fail("isSupportedLocale('ja') は true を返すべき");
      }
    });
  });
});

describe("DEVICE_FALLBACK_LOCALE", () => {
  it('DEVICE_FALLBACK_LOCALE === "en" (PM 決定事項)', () => {
    expect(DEVICE_FALLBACK_LOCALE).toBe("en");
  });
});

describe("BCP 47 言語タグの境界値", () => {
  it('isSupportedLocale("ja-JP") → false (region タグ付き)', () => {
    expect(isSupportedLocale("ja-JP")).toBe(false);
  });
  it('isSupportedLocale("en-US") → false (region タグ付き)', () => {
    expect(isSupportedLocale("en-US")).toBe(false);
  });
  it('isSupportedLocale("zh-CN") → false (region タグ付きは非対応、"zh" のみ対応)', () => {
    expect(isSupportedLocale("zh-CN")).toBe(false);
  });
});
