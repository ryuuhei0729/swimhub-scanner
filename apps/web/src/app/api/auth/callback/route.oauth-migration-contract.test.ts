// QA Phase A: OAuth 共有パッケージ (`@ryuuhei0729/swimhub-oauth/web` の `handleAuthCallback`)
// への委譲リファクタ「前」に、現行 apps/web/src/app/api/auth/callback/route.ts の挙動を
// 固定する回帰テスト。
//
// 目的: このファイルは「リファクタ前の現行コードで green」かつ「リファクタ後 (共有パッケージへ
// 委譲した実装) でも green」であることを 1:1 挙動維持の客観的証拠とする。
// 例外は1件のみ (本ファイル末尾の観点14)。これはリファクタ前は green にならない意図的な
// 挙動変更のため、リファクタ後の期待値で通常の it(...) として有効化済み。詳細は当該テスト
// 直前のコメントを参照。
//
// 設計方針 (リファクタ後も green であり続けるための配慮):
// - 成功系のモック (verifyOtp / exchangeCodeForSession) は、現行コードが session の有無を
//   チェックしない箇所であっても、常に `data.session` を含むリアルな成功レスポンスを返す。
//   共有パッケージはエラーが無くても session が無ければ session_creation_failed 扱いにするため、
//   「成功」を検証したいテストで session を省略すると、リファクタ後に意図せず red になってしまう。
// - `next/headers` の cookies と `@supabase/ssr` の createServerClient のみ vi.mock で差し替え、
//   route.ts 本体のロジック (validateRedirectPath 等) は実装のまま実行する (トートロジー回避)。
// - createServerClient に渡される `cookies.setAll` を捕捉し、verifyOtp/exchangeCodeForSession の
//   モック実装から呼び出すことで、実際の Cookie 反映 (applyCookies) までエンドツーエンドで検証する。
//
// scanner 固有の差分 (timer との比較):
// - scanner のログイン遷移先は `/ja/login` 固定。ただし scanner にも `[locale]` ルーティングと
//   `packages/i18n` の5言語対応は存在する。固定なのは移行前の route.ts が全箇所ハードコード
//   していた挙動を1:1で保つためであり、ロケール機構が無いからではない
//   (timer は `@swimhub-timer/i18n` の defaultLocale から `/${locale}/login` を組み立てる)。
// - 成功時のデフォルト遷移先も `/` 固定 (timer は `/${locale}`)。
//
// 参考にした実装/テスト:
// - /Users/ryuuhei_0729/SwimHub/swimhub-timer/apps/web/src/app/api/auth/callback/route.oauth-migration-contract.test.ts
//   (同種の目的・手法を持つ姉妹ファイル。scanner と timer の現行 route.ts は byte-identical)
// - /Users/ryuuhei_0729/SwimHub/swimhub-timer/apps/web/src/app/api/auth/callback/route.ts
//   (リファクタ後の委譲先の姿)
//
// 注記: 同ディレクトリの route.test.ts は token_hash + type 機能追加時の QA テストとして
// 既に存在しており、観点の一部 (type 別成功系・token_hash/code 優先順位・missing_code・
// redirect_to の基本ケース等) は重複してカバーされている。本ファイルは「共有パッケージ移行の
// 契約」を単独で説明できるよう、意図的に自己完結させている (特に redirect_to の異常系網羅と
// Cookie 反映の検証は route.test.ts には無い観点)。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

type CookieToSetForTest = { name: string; value: string; options?: Record<string, unknown> };
interface SupabaseCookieMethods {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookies: CookieToSetForTest[]) => void;
}

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
let capturedCookieMethods: SupabaseCookieMethods | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, options: { cookies: SupabaseCookieMethods }) => {
      capturedCookieMethods = options.cookies;
      return { auth: { verifyOtp, exchangeCodeForSession } };
    },
  ),
}));

import { GET } from "@/app/api/auth/callback/route";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

const ORIGIN = "http://localhost:3000";
const LOGIN = `${ORIGIN}/ja/login`;

beforeEach(() => {
  vi.clearAllMocks();
  capturedCookieMethods = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

// ============================================================
// 観点1: token_hash + 有効な type → verifyOtp が呼ばれ、exchangeCodeForSession は
// 呼ばれない。成功時のリダイレクト先。
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点1: token_hash + 有効な type (verifyOtpフロー)", () => {
  it("verifyOtp が正しい引数で呼ばれ、exchangeCodeForSession は呼ばれず、成功時は / へリダイレクトされる", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));

    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "abc123" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  // scanner は type ごとの専用画面を持たないため (getDefaultRedirectForOtpType が全 type で
  // "/" を返す)、他の有効な type (recovery/email_change/email/magiclink) でも結果は同一になる。
  // 個々の type の網羅は既存の route.test.ts (it.each) が担っているため、本ファイルでは代表
  // として signup のみを扱う。
});

// ============================================================
// 観点2: token_hash と code が両方ある場合 → token_hash が優先される
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点2: token_hash と code が両方存在する場合", () => {
  it("token_hash が優先され、verifyOtp のみが呼ばれる (code は無視される)", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup&code=pkce-code`),
    );

    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "abc123" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("境界値: token_hash が空文字の場合は falsy とみなされ code 分岐にフォールバックする", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=&code=pkce-code`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("token_hash の優先は type の妥当性を問わない: type が不正でも code へはフォールバックせず invalid_request になる", async () => {
    // handleVerifyOtpFlow は token_hash が truthy であれば結果 (invalid_request を含む) を
    // 即 return する。code 分岐へは一切到達しない。「type さえ正しければ通る」という誤解を
    // 防ぐための固定テスト。
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=invite&code=pkce-code`),
    );

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=invalid_request`);
  });
});

// ============================================================
// 観点3: type が不正 / 欠落 / 空文字 → ?error=invalid_request
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点3: type が不正・欠落・空文字の場合は invalid_request", () => {
  it.each(["invite", "unknown_value"])(
    "type=%s の場合、verifyOtp を呼ばず invalid_request へリダイレクトされる",
    async (typeValue) => {
      const res = await GET(
        makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=${typeValue}`),
      );

      expect(verifyOtp).not.toHaveBeenCalled();
      expect(location(res)).toBe(`${LOGIN}?error=invalid_request`);
    },
  );

  it("境界値: type パラメータが完全に欠落している場合も invalid_request へ", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=invalid_request`);
  });

  it("境界値: type が空文字の場合も invalid_request へ", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=invalid_request`);
  });
});

// ============================================================
// 観点4: token_hash も code も無い → ?error=missing_code
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点4: token_hash も code も無い場合は missing_code", () => {
  it("クエリパラメータが完全に無い場合、verifyOtp / exchangeCodeForSession とも呼ばれず missing_code へ", async () => {
    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=missing_code`);
  });
});

// ============================================================
// 観点5: 環境変数 (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) 未設定 → ?error=config_error
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点5: 環境変数が未設定の場合は config_error", () => {
  it("token_hash フロー: 環境変数が両方未設定なら verifyOtp を呼ばず config_error へ", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=config_error`);
  });

  it("code フロー: 環境変数が両方未設定なら exchangeCodeForSession を呼ばず config_error へ", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=config_error`);
  });

  it("境界値: ANON_KEY のみ欠落していても config_error になる (OR 条件であることの確認)", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${LOGIN}?error=config_error`);
  });
});

// ============================================================
// 観点6: verifyOtp がエラーを返す場合 (error.code の有無)
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点6: verifyOtp のエラーコード伝播", () => {
  it("error.code がある場合はそのコードがそのまま error クエリに反映される (例: otp_expired)", async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "otp_expired", message: "Token has expired or is invalid" },
    });

    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=expired&type=signup`),
    );

    expect(location(res)).toBe(`${LOGIN}?error=otp_expired`);
  });

  it("error.code が無い場合は auth_failed にフォールバックする", async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid token" },
    });

    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?token_hash=tampered&type=signup`),
    );

    expect(location(res)).toBe(`${LOGIN}?error=auth_failed`);
  });
});

// ============================================================
// 観点7: verifyOtp 成功でも session が無い場合 → session_creation_failed
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点7: verifyOtp成功時にsessionが無い場合", () => {
  it("session_creation_failed へリダイレクトされる", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: null });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));

    expect(location(res)).toBe(`${LOGIN}?error=session_creation_failed`);
  });
});

// ============================================================
// 観点8: code → exchangeCodeForSession 成功時のリダイレクト先
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点8: codeフロー (exchangeCodeForSession) の成功", () => {
  it("token_hash が無く code のみの場合、exchangeCodeForSession が呼ばれ / へリダイレクトされる", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" }, user: { id: "u1" } },
      error: null,
    });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(location(res)).toBe(`${ORIGIN}/`);
  });
});

// ============================================================
// 観点9: exchangeCodeForSession がエラー → ?error=auth_failed
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点9: exchangeCodeForSessionのエラー", () => {
  it("auth_failed へリダイレクトされる", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "boom" },
    });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=bad-code`));

    expect(location(res)).toBe(`${LOGIN}?error=auth_failed`);
  });
});

// ============================================================
// 観点10: 例外 throw (reject) は auth_failed に丸められる
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点10: 例外throw (catch節での丸め込み)", () => {
  it("verifyOtp が reject した場合は auth_failed へ", async () => {
    verifyOtp.mockRejectedValue(new Error("network error"));

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));

    expect(location(res)).toBe(`${LOGIN}?error=auth_failed`);
  });

  it("exchangeCodeForSession が reject した場合は auth_failed へ", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("network error"));

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));

    expect(location(res)).toBe(`${LOGIN}?error=auth_failed`);
  });
});

// ============================================================
// 観点11: redirect_to クエリの正常系 (相対パスが尊重される)
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点11: redirect_to (正常系)", () => {
  it("codeフロー: 相対パスの redirect_to が優先される", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=%2Fja%2Fscan`),
    );

    expect(location(res)).toBe(`${ORIGIN}/ja/scan`);
  });

  it("token_hashフロー: 相対パスの redirect_to が type 別デフォルトより優先される", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup&redirect_to=%2Fja%2Fscan`,
      ),
    );

    expect(location(res)).toBe(`${ORIGIN}/ja/scan`);
  });
});

// ============================================================
// 観点12: redirect_to が不正な場合はデフォルトパスにフォールバックする
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点12: redirect_to (異常系 → デフォルトパスへフォールバック)", () => {
  it("scheme付き外部オリジン (https://evil.com) は拒否される (schemeチェックで捕捉)", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=${encodeURIComponent("https://evil.com/phish")}`,
      ),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("scheme付きだが権威部(//)を持たない値 (javascript:) も拒否される", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=${encodeURIComponent("javascript:alert(1)")}`,
      ),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("プロトコル相対URL (//evil.com) は拒否される", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=${encodeURIComponent("//evil.com/phish")}`,
      ),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("パストラバーサル (..) を含む値は拒否される", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=${encodeURIComponent("/foo/../../bar")}`,
      ),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("制御文字 (CRLF) を含む値は拒否される (ヘッダーインジェクション対策)", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    // %2F → "/" , %0D%0A → CRLF。searchParams.get() で1段階目のデコードが行われた後、
    // validateRedirectPath 内の decodeURIComponent はパーセント記号が残っていないため
    // 実質ノーオペレーションになる。結果として "/foo\r\nbar" という制御文字混じりの
    // 文字列がそのまま検証対象になる。
    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=%2Ffoo%0D%0Abar`),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("'/' で始まらない値は拒否される", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=evil.com`),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });

  it("バックスラッシュによる同一オリジンチェック回避は最終的なURL解決で捕捉される (/\\evil.com)", async () => {
    // "/\evil.com" は「scheme無し」「'//'始まりでもない」「'/'始まり」「制御文字無し」
    // 「'..'無し」という前段の全ヒューリスティックをすり抜けるが、WHATWG URL の仕様上
    // 特別スキーム (http/https) ではバックスラッシュがスラッシュとして正規化されるため
    // new URL("/\evil.com", origin) は origin: "http://evil.com" に解決される
    // (Node実測で検証済み)。最後の同一オリジン確認 (new URL(...).origin !== origin) が
    // 前段のヒューリスティックとは独立した最終防衛線として機能していることを固定する。
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    const res = await GET(
      makeRequest(
        `${ORIGIN}/api/auth/callback?code=pkce-code&redirect_to=${encodeURIComponent("/\\evil.com")}`,
      ),
    );

    expect(location(res)).toBe(`${ORIGIN}/`);
  });
});

// ============================================================
// 観点13: Cookie が成功時・エラー時ともにレスポンスへ反映される
// ============================================================
describe("GET /api/auth/callback (scanner) — 観点13: Cookie反映 (applyCookies)", () => {
  it("成功時、Supabaseが書き込んだCookieが最終レスポンスに反映される (sameSite/pathは強制上書き、httpOnly等は保持)", async () => {
    verifyOtp.mockImplementation(async () => {
      capturedCookieMethods?.setAll([
        {
          name: "sb-scanner-auth-token",
          value: "session-cookie-value",
          options: {
            httpOnly: true,
            maxAge: 3600,
            sameSite: "strict",
            path: "/should-be-overridden",
          },
        },
      ]);
      return { data: { session: { access_token: "t" } }, error: null };
    });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));

    expect(location(res)).toBe(`${ORIGIN}/`);
    const cookie = res.cookies.get("sb-scanner-auth-token");
    expect(cookie?.value).toBe("session-cookie-value");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.maxAge).toBe(3600);
    // applyCookies はこの2属性をオプションのスプレッド後に強制上書きする。
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  it("エラー時にも収集済みのCookieが最終レスポンス (エラーリダイレクト) に反映される", async () => {
    verifyOtp.mockImplementation(async () => {
      capturedCookieMethods?.setAll([
        { name: "sb-scanner-auth-token", value: "", options: { maxAge: 0 } },
      ]);
      return { data: { session: null }, error: { message: "invalid" } };
    });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?token_hash=abc123&type=signup`));

    expect(location(res)).toBe(`${LOGIN}?error=auth_failed`);
    const cookie = res.cookies.get("sb-scanner-auth-token");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.sameSite).toBe("lax");
  });
});

// ============================================================
// 観点14 (意図的な挙動変更): codeフローで exchangeCodeForSession が成功しても
// session が無いケース
// ============================================================
//
// PM承認済みの意図的な挙動変更ポイント。リファクタ前の route.ts の code経路には session の
// 存在チェックが無く、error が無ければ session の有無に関わらず成功リダイレクトしていた。
//
// リファクタ後に委譲する共有パッケージ (handleAuthCallback.ts) は token_hash経路と挙動を
// 統一するため、session が無い場合は error=session_creation_failed を返す設計になっている
// (swim-hub自身の同ファイルが元々持っていた安全な挙動を共通化したもの。
// packages/oauth/src/web/handleAuthCallback.ts のJSDoc点5を参照)。
//
describe("GET /api/auth/callback (scanner) — 観点14 [意図的な挙動変更・リファクタ後に有効化]: codeフローでsessionが無いケース", () => {
  it("sessionが無い場合はsession_creation_failedへ (共有パッケージでtoken_hash経路と統一される)", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: null });

    const res = await GET(makeRequest(`${ORIGIN}/api/auth/callback?code=pkce-code`));

    expect(location(res)).toBe(`${LOGIN}?error=session_creation_failed`);
  });
});
