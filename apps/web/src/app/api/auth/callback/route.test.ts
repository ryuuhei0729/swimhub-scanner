// QA Phase B: /api/auth/callback (scanner) の token_hash + type 分岐 (verifyOtp フロー) 検証。
// Sprint Contract 対応: V-04 (code 分岐の非破壊回帰), V-07 (token_hash + code 併存時は token_hash 優先),
// 境界値 (空文字 token_hash / 未知 type / type なし)。
//
// トートロジー回避: route.ts のロジックを再実装せず実ハンドラ (GET) を import し、
// 依存 (next/headers の cookies / @supabase/ssr の createServerClient) のみ vi.mock で差し替える。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { verifyOtp, exchangeCodeForSession },
  })),
}));

import { GET } from "@/app/api/auth/callback/route";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

const ORIGIN = "http://localhost:3000";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

describe("GET /api/auth/callback (scanner) — token_hash フロー (verifyOtp)", () => {
  it.each(["signup", "recovery", "email_change", "email", "magiclink"])(
    "%s: 成功時は / へリダイレクトされる (scanner には専用画面が無いため type 不問)",
    async (type) => {
      verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
      const res = await GET(
        makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=${type}`),
      );
      expect(verifyOtp).toHaveBeenCalledWith({ type, token_hash: "abc123" });
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(location(res)).toBe(`${ORIGIN}/`);
    },
  );

  it("未知の type (invite) は verifyOtp を呼ばずに invalid_request へ", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=invite`));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=invalid_request`);
  });

  it("境界値: type パラメータが無い場合も invalid_request へ", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123`));
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=invalid_request`);
  });

  it("V-12: verifyOtp が otp_expired エラーを返すと /login?error=otp_expired へ", async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "otp_expired", message: "expired" },
    });
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=expired&type=signup`),
    );
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=otp_expired`);
  });

  it("V-14: 改ざんされた token_hash で verifyOtp がエラー (code なし) → auth_failed へ", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: "invalid" } });
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=tampered&type=signup`),
    );
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=auth_failed`);
  });

  it("verifyOtp 成功でも session が無い場合は session_creation_failed へ", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=session_creation_failed`);
  });

  it("redirect_to が明示的に指定された場合は優先される (後方互換)", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup&redirect_to=%2Fja%2Fscan`,
      ),
    );
    expect(location(res)).toBe(`${ORIGIN}/ja/scan`);
  });

  it("redirect_to が不正 (外部オリジン) な場合は / にフォールバックする", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup&redirect_to=${encodeURIComponent("https://evil.com/phish")}`,
      ),
    );
    expect(location(res)).toBe(`${ORIGIN}/`);
  });
});

describe("GET /api/auth/callback (scanner) — V-07: token_hash と code が両方存在する場合", () => {
  it("token_hash が優先され exchangeCodeForSession は呼ばれない", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup&code=pkce-code`),
    );
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "abc123" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/`);
  });
});

describe("GET /api/auth/callback (scanner) — code フロー (V-04: 既存 OAuth 回帰)", () => {
  it("token_hash が無く code のみの場合は exchangeCodeForSession が呼ばれ / へ", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "mock-access-token" } },
      error: null,
    });
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("境界値: token_hash が空文字なら code 分岐にフォールバックする", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "mock-access-token" } },
      error: null,
    });
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=&code=pkce-code`));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
  });

  it("境界値: code も token_hash も無い場合は missing_code へ", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback`));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=missing_code`);
  });

  it("exchangeCodeForSession がエラーを返すと auth_failed へ (verifyOtp 追加後も維持)", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "boom" } });
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=bad-code`));
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=auth_failed`);
  });
});

describe("GET /api/auth/callback (scanner) — V-15/V-16", () => {
  it("V-15: type=unknown_value は invalid_request へ", async () => {
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=unknown_value`),
    );
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=invalid_request`);
  });

  it("V-16: パラメータが完全に無い場合は missing_code へ (verifyOtp/exchangeCodeForSession とも未呼出)", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback`));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/ja/login?error=missing_code`);
  });
});

describe("GET /api/auth/callback (scanner) — 「直近で利用」ログイン手法の記録", () => {
  function lastLoginCookie(res: Response): string | undefined {
    return res.headers.getSetCookie().find((c) => c.startsWith("swimhub_last_login_method="));
  }

  it("OAuth (code) でセッションが確立したら login_method を JS から読める Cookie に記録する", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "mock-access-token" } },
      error: null,
    });
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?login_method=apple&code=pkce-code`),
    );
    const cookie = lastLoginCookie(res);
    expect(cookie).toContain("swimhub_last_login_method=apple");
    expect(cookie).toContain("Max-Age=31536000");
    expect(cookie).not.toMatch(/HttpOnly/i);
    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("コード交換に失敗した (ログイン失敗) 場合は記録しない", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: { message: "boom" } });
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?login_method=google&code=bad-code`),
    );
    expect(lastLoginCookie(res)).toBeUndefined();
  });

  it("メール確認 (token_hash) フローでは login_method があっても記録しない", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?login_method=google&token_hash=abc123&type=signup`,
      ),
    );
    expect(lastLoginCookie(res)).toBeUndefined();
  });

  it("login_method が無い・不正な場合は記録しない", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "mock-access-token" } },
      error: null,
    });
    const noParam = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));
    expect(lastLoginCookie(noParam)).toBeUndefined();
    const invalid = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?login_method=evil%3B%20Domain%3Dx&code=pkce-code`),
    );
    expect(lastLoginCookie(invalid)).toBeUndefined();
  });
});
