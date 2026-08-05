// QA Phase B: /api/scan-timesheet の検証。
//
// 対象:
//   - C-2 (既存 QA 資産): 「ゲストか否か」の分岐が「認証が実際に成立したか」という
//     観測可能な結果で判定されているか。
//   - C-4 (今回追加): 無料枠の原子的予約 (reserveUserScan) → Gemini → 失敗時解放
//     (releaseUserScan) という制御フローが「観測可能な振る舞い」として機能しているか。
//     内部の呼び出し順序そのものを仕様として固定しない (呼ばれる/呼ばれない、
//     200/429 等の結果、解放が高々1回であることのみを検証する)。
//   - 監査ログ (logTokenConsumption) の insert 失敗が 200 を握りつぶす方向に働くかの確認。
//
// PM 実測・裁定 (2026-08-01, Phase A→B 間の修正指示 - C-2 に関して):
//   - web クライアントは Cookie 認証 (Authorization ヘッダー無し) が正規の認証方式
//     (components/scanner/ScannerFlow.tsx / lib/api-helpers.ts の verifyAuth は
//     Bearer が無ければ Cookie 認証にフォールバックする)。
//   - よって「Authorization ヘッダーの有無」を信頼境界にする実装は誤り。
//     本命の攻撃ケースは「有効なセッション Cookie を持つ (Authorization ヘッダーは
//     無い) ユーザーが X-Guest-Mode: true を送った場合」であり、これが C-2 の中核。
//
// トートロジー回避: route.ts のロジックを再実装せず実ハンドラ (POST) を import し、
// 依存 (verifyAuth / usage.ts / gemini client / cloudflare context / rate-limit) の
// みを vi.mock で差し替える。内部呼び出し順序 (reserve→Gemini→release) は
// アサートせず、観測可能な結果 (レスポンス status / 各関数が呼ばれた回数) のみを見る。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const verifyAuth = vi.fn();
const ensureUserDocument = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  verifyAuth: (...args: unknown[]) => verifyAuth(...args),
  ensureUserDocument: (...args: unknown[]) => ensureUserDocument(...args),
}));

const reserveUserScan = vi.fn();
const releaseUserScan = vi.fn();
const logTokenConsumption = vi.fn();
vi.mock("@/lib/supabase/usage", () => ({
  reserveUserScan: (...args: unknown[]) => reserveUserScan(...args),
  releaseUserScan: (...args: unknown[]) => releaseUserScan(...args),
  logTokenConsumption: (...args: unknown[]) => logTokenConsumption(...args),
}));

const scanTimesheetWithGemini = vi.fn();
vi.mock("@/lib/gemini/client", () => ({
  scanTimesheetWithGemini: (...args: unknown[]) => scanTimesheetWithGemini(...args),
}));

const getClientIp = vi.fn();
vi.mock("@/lib/client-ip", () => ({
  getClientIp: (...args: unknown[]) => getClientIp(...args),
}));

const reserveGuestScan = vi.fn();
const rollbackGuestScanCount = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  reserveGuestScan: (...args: unknown[]) => reserveGuestScan(...args),
  rollbackGuestScanCount: (...args: unknown[]) => rollbackGuestScanCount(...args),
}));

const getCloudflareContext = vi.fn();
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: (...args: unknown[]) => getCloudflareContext(...args),
}));

import { POST } from "@/app/api/scan-timesheet/route";

const ORIGIN = "http://localhost:3000";

const VALID_SCAN_RESULT = {
  menu: { distance: 50, repCount: 1, setCount: 1 },
  swimmers: [{ no: 1, name: "", style: "Fr", times: [30.0] }],
};

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(`${ORIGIN}/api/scan-timesheet`, {
    method: "POST",
    headers,
    body: JSON.stringify({ image: "aGVsbG8=", mimeType: "image/jpeg" }),
  });
}

const AUTH_UID = "authed-user-001";
const FAKE_KV = {
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
};

const UNAUTHENTICATED_RESULT = {
  error: new Response(JSON.stringify({ error: "認証が必要です", code: "UNAUTHORIZED" }), {
    status: 401,
  }),
};

function mockAuthenticatedSession(): void {
  const fakeSupabase = {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
  verifyAuth.mockResolvedValue({
    result: {
      auth: { uid: AUTH_UID, email: "authed@example.test" },
      supabase: fakeSupabase,
      setCookiesOnResponse: () => {},
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  // デフォルトは「認証が実際に成立している (Cookie/Bearer いずれか有効)」状態。
  // 真のゲスト (未認証) を表すテストだけ、明示的に UNAUTHENTICATED_RESULT で上書きする。
  mockAuthenticatedSession();
  ensureUserDocument.mockResolvedValue({
    plan: "free",
    premiumExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  reserveUserScan.mockResolvedValue({ allowed: true, isPremium: false, tokensUsed: 1 });
  releaseUserScan.mockResolvedValue(undefined);
  logTokenConsumption.mockResolvedValue(undefined);
  scanTimesheetWithGemini.mockResolvedValue(JSON.stringify(VALID_SCAN_RESULT));
  getClientIp.mockReturnValue("203.0.113.1");
  reserveGuestScan.mockResolvedValue({ allowed: true, remaining: 0 });
  rollbackGuestScanCount.mockResolvedValue(undefined);
  getCloudflareContext.mockResolvedValue({ env: { RATE_LIMIT_KV: FAKE_KV } });
});

describe("POST /api/scan-timesheet — C-2: X-Guest-Mode ヘッダーだけでゲスト経路に落とせない", () => {
  it("C-2 中核: 有効なセッション Cookie を持つユーザー (Authorization ヘッダーは無い) が X-Guest-Mode: true を送っても、認証済み経路 (reserveUserScan) を通り、ゲスト経路 (reserveGuestScan) を経由しない", async () => {
    // 認証は Cookie 経由で成立している想定 (mockAuthenticatedSession, beforeEach 既定)。
    // web クライアントの正規の認証方式であり Authorization ヘッダーは付与しない。
    await POST(
      makeRequest({
        "Content-Type": "application/json",
        "X-Guest-Mode": "true",
      }),
    );

    expect(reserveUserScan).toHaveBeenCalledWith(AUTH_UID);

    // ゲスト経路 (IPベースのレート制限のみ・日次利用量を一切消費しない経路) が
    // 使われていないことの確認。これが呼ばれてしまっている = 無料枠バイパス (C-2)。
    expect(reserveGuestScan).not.toHaveBeenCalled();
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it("有効な Authorization ヘッダー (Bearer) で認証が成立したユーザーが X-Guest-Mode: true を送っても、認証済み経路を通る", async () => {
    await POST(
      makeRequest({
        "Content-Type": "application/json",
        Authorization: "Bearer valid-jwt-for-authed-user",
        "X-Guest-Mode": "true",
      }),
    );

    expect(reserveUserScan).toHaveBeenCalledWith(AUTH_UID);
    expect(reserveGuestScan).not.toHaveBeenCalled();
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it("回帰: 認証が一切成立していない (Cookie も Bearer も無い/無効な) 真のゲストリクエストは、引き続きゲスト経路 (IP レート制限) を通る", async () => {
    verifyAuth.mockResolvedValue(UNAUTHENTICATED_RESULT);

    await POST(
      makeRequest({
        "Content-Type": "application/json",
        "X-Guest-Mode": "true",
      }),
    );

    expect(reserveGuestScan).toHaveBeenCalled();
    expect(reserveUserScan).not.toHaveBeenCalled();
  });

  it("境界値: Authorization ヘッダーはあるがトークンが無効 (認証不成立) な場合は、X-Guest-Mode: true ならゲスト経路にフォールバックできる", async () => {
    verifyAuth.mockResolvedValue(UNAUTHENTICATED_RESULT);

    await POST(
      makeRequest({
        "Content-Type": "application/json",
        Authorization: "Bearer expired-or-tampered-token",
        "X-Guest-Mode": "true",
      }),
    );

    expect(reserveGuestScan).toHaveBeenCalled();
    expect(reserveUserScan).not.toHaveBeenCalled();
  });

  it("回帰: X-Guest-Mode ヘッダーが無く、Cookie 認証が成立している通常リクエストは、これまで通り認証済み経路を通る", async () => {
    await POST(
      makeRequest({
        "Content-Type": "application/json",
      }),
    );

    expect(reserveUserScan).toHaveBeenCalledWith(AUTH_UID);
    expect(reserveGuestScan).not.toHaveBeenCalled();
  });

  it("回帰: X-Guest-Mode ヘッダーも認証情報も無いリクエストは 401 (未認証) となり、どちらの経路も消費しない", async () => {
    verifyAuth.mockResolvedValue(UNAUTHENTICATED_RESULT);

    const res = await POST(
      makeRequest({
        "Content-Type": "application/json",
      }),
    );

    expect(res.status).toBe(401);
    expect(reserveUserScan).not.toHaveBeenCalled();
    expect(reserveGuestScan).not.toHaveBeenCalled();
  });
});

describe("POST /api/scan-timesheet — C-4: 認証済みユーザーの原子的予約→解放", () => {
  it("予約が拒否された場合 (無料枠使い切り) は 429 を返し、Gemini を一切呼ばない", async () => {
    reserveUserScan.mockResolvedValue({ allowed: false, isPremium: false, tokensUsed: 1 });

    const res = await POST(makeRequest({ "Content-Type": "application/json" }));

    expect(res.status).toBe(429);
    expect(scanTimesheetWithGemini).not.toHaveBeenCalled();
    expect(releaseUserScan).not.toHaveBeenCalled();
  });

  it("予約成功後に Gemini がエラーを返す (2回とも失敗) 場合、releaseUserScan がちょうど1回呼ばれる", async () => {
    scanTimesheetWithGemini.mockRejectedValue(new Error("gemini down"));

    const res = await POST(makeRequest({ "Content-Type": "application/json" }));

    expect(res.status).toBe(500);
    expect(releaseUserScan).toHaveBeenCalledTimes(1);
    expect(releaseUserScan).toHaveBeenCalledWith(AUTH_UID);
  });

  it("予約成功後にスキャンが成功した場合、releaseUserScan は呼ばれない", async () => {
    const res = await POST(makeRequest({ "Content-Type": "application/json" }));

    expect(res.status).toBe(200);
    expect(releaseUserScan).not.toHaveBeenCalled();
  });

  it("Premium ユーザー (isPremium=true) はスキャン成功時に監査ログ (logTokenConsumption) を記録しない", async () => {
    reserveUserScan.mockResolvedValue({ allowed: true, isPremium: true, tokensUsed: 5 });

    const res = await POST(makeRequest({ "Content-Type": "application/json" }));

    expect(res.status).toBe(200);
    expect(logTokenConsumption).not.toHaveBeenCalled();
  });

  it("Free ユーザーはスキャン成功時に監査ログ (logTokenConsumption) を記録する", async () => {
    const res = await POST(makeRequest({ "Content-Type": "application/json" }));

    expect(res.status).toBe(200);
    expect(logTokenConsumption).toHaveBeenCalledWith(expect.anything(), AUTH_UID, "scanner_scan");
  });

  it("監査ログ (logTokenConsumption) の insert が失敗しても、ユーザーには 200 が返る (Gemini 費用を払った結果を握りつぶさない)", async () => {
    logTokenConsumption.mockRejectedValue(new Error("insert failed"));

    const res = await POST(makeRequest({ "Content-Type": "application/json" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(VALID_SCAN_RESULT);
    // 予約自体は成功しているため、失敗した監査ログのために解放してはならない
    expect(releaseUserScan).not.toHaveBeenCalled();
  });
});

describe("POST /api/scan-timesheet — C-3: ゲスト経路の原子的予約→解放 (回帰)", () => {
  it("予約が拒否された場合 (ゲスト上限到達) は 429 を返し、Gemini を一切呼ばない", async () => {
    verifyAuth.mockResolvedValue(UNAUTHENTICATED_RESULT);
    reserveGuestScan.mockResolvedValue({ allowed: false, remaining: 0 });

    const res = await POST(
      makeRequest({ "Content-Type": "application/json", "X-Guest-Mode": "true" }),
    );

    expect(res.status).toBe(429);
    expect(scanTimesheetWithGemini).not.toHaveBeenCalled();
    expect(rollbackGuestScanCount).not.toHaveBeenCalled();
  });

  it("予約成功後に Gemini が失敗した場合、rollbackGuestScanCount がちょうど1回呼ばれる", async () => {
    verifyAuth.mockResolvedValue(UNAUTHENTICATED_RESULT);
    scanTimesheetWithGemini.mockRejectedValue(new Error("gemini down"));

    const res = await POST(
      makeRequest({ "Content-Type": "application/json", "X-Guest-Mode": "true" }),
    );

    expect(res.status).toBe(500);
    expect(rollbackGuestScanCount).toHaveBeenCalledTimes(1);
  });

  it("予約成功後にスキャンが成功した場合、rollbackGuestScanCount は呼ばれない", async () => {
    verifyAuth.mockResolvedValue(UNAUTHENTICATED_RESULT);

    const res = await POST(
      makeRequest({ "Content-Type": "application/json", "X-Guest-Mode": "true" }),
    );

    expect(res.status).toBe(200);
    expect(rollbackGuestScanCount).not.toHaveBeenCalled();
  });
});
