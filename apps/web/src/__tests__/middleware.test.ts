/**
 * Issue #27 + #17: middleware セキュリティヘッダーテスト — swimhub-scanner
 *
 * Sprint Contract 検証観点:
 *   [Issue #27] 4 種のセキュリティヘッダーが全ルートのレスポンスに付与される
 *     - X-Frame-Options: DENY
 *     - X-Content-Type-Options: nosniff
 *     - Referrer-Policy: strict-origin-when-cross-origin
 *     - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *
 *   [Issue #17] CSP ヘッダー (強制モード) が付与される
 *     Content-Security-Policy に以下のディレクティブが含まれること:
 *     - default-src 'self'
 *     - script-src 'self' 'unsafe-inline'
 *     - style-src 'self' 'unsafe-inline'
 *     - img-src 'self' data: blob: https://*.supabase.co
 *     - connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com
 *     - frame-ancestors 'none'
 *     - object-src 'none'
 *     ※ Report-Only ではなく Content-Security-Policy ヘッダーを使用すること
 *
 * テスト対象: src/middleware.ts
 *
 * 実装方針:
 *   updateSession をモックし、ヘッダーが設定された NextResponse を返す middleware を
 *   単体テストする。ネットワークや Supabase への依存をゼロにする。
 */

import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

// updateSession をモック — 空の NextResponse を返すだけ
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn().mockImplementation(() => {
    return Promise.resolve(NextResponse.next());
  }),
}));

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------
function makeGetRequest(path: string = "/ja"): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

// ---------------------------------------------------------------------------
// テスト本体
// ---------------------------------------------------------------------------
describe("scanner middleware — セキュリティヘッダー", () => {
  // -------------------------------------------------------------------------
  // Issue #27: セキュリティヘッダー 4 種
  // -------------------------------------------------------------------------
  describe("[Issue #27] X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy", () => {
    it("X-Frame-Options: DENY が設定される", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("X-Content-Type-Options: nosniff が設定される", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("Referrer-Policy: strict-origin-when-cross-origin が設定される", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    it("Permissions-Policy: camera=(), microphone=(), geolocation=() が設定される", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      expect(res.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
    });

    it("ルート '/' でもヘッダーが付与される", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/"));
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("API ルートでもヘッダーが付与される", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/api/analyze"));
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  // -------------------------------------------------------------------------
  // Issue #17: CSP ヘッダー (scanner 固有)
  // -------------------------------------------------------------------------
  describe("[Issue #17] Content-Security-Policy", () => {
    it("Content-Security-Policy ヘッダーが存在する (Report-Only ではない)", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      // 強制モードであること
      expect(res.headers.get("Content-Security-Policy")).not.toBeNull();
      // Report-Only が設定されていないこと
      expect(res.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
    });

    it("default-src 'self' が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("default-src 'self'");
    });

    it("script-src 'self' 'unsafe-inline' が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    });

    it("style-src 'self' 'unsafe-inline' が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("img-src に data: blob: https://*.supabase.co が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("img-src");
      expect(csp).toContain("data:");
      expect(csp).toContain("blob:");
      expect(csp).toContain("https://*.supabase.co");
    });

    it("connect-src に Supabase と Stripe が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("https://*.supabase.co");
      expect(csp).toContain("wss://*.supabase.co");
      expect(csp).toContain("https://api.stripe.com");
    });

    it("frame-ancestors 'none' が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("object-src 'none' が含まれる", async () => {
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("object-src 'none'");
    });

    it("Gemini の connect-src が含まれない (サーバーサイドのみ)", async () => {
      // Gemini はサーバーサイドのみなので、CSP の connect-src に追加不要
      const { middleware } = await import("../middleware");
      const res = await middleware(makeGetRequest("/ja"));
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      // generativelanguage.googleapis.com は含まれないこと
      expect(csp).not.toContain("generativelanguage.googleapis.com");
    });
  });
});
