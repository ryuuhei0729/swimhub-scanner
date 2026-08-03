// QA Phase A/B: /api/scan-timesheet の C-2 (ゲストモード判定バイパス) 検証。
//
// Sprint Contract 対応:
//   - Deliverable 5: 「ゲストか否か」の分岐を、内部でどの関数を呼ぶか (verifyAuth の
//     呼び出し有無など) ではなく、「認証が実際に成立したか」という観測可能な結果
//     (canUserScan/incrementScanCount が呼ばれる = 認証済み経路 / reserveGuestScan が
//     呼ばれる = ゲスト経路) で判定できているかを検証する。
//
// PM 実測・裁定 (2026-08-01, Phase A→B 間の修正指示):
//   - web クライアントは Cookie 認証 (Authorization ヘッダー無し) が正規の認証方式
//     (components/scanner/ScannerFlow.tsx / lib/api-helpers.ts の verifyAuth は
//     Bearer が無ければ Cookie 認証にフォールバックする)。
//   - よって「Authorization ヘッダーの有無」を信頼境界にする実装は誤り。
//     本命の攻撃ケースは「有効なセッション Cookie を持つ (Authorization ヘッダーは
//     無い) ユーザーが X-Guest-Mode: true を送った場合」であり、これが C-2 の中核。
//   - このファイルは「verifyAuth が呼ばれたか」という内部呼び出し順序を一切
//     アサートしない。verifyAuth (=認証解決) の結果をモックで作り込み、
//     その結果に応じてどちらの経路 (認証済み/ゲスト) を通ったかだけを検証する。
//
// トートロジー回避: route.ts のロジックを再実装せず実ハンドラ (POST) を import し、
// 依存 (verifyAuth / usage.ts / gemini client / cloudflare context / rate-limit) の
// みを vi.mock で差し替える。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const verifyAuth = vi.fn();
const ensureUserDocument = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  verifyAuth: (...args: unknown[]) => verifyAuth(...args),
  ensureUserDocument: (...args: unknown[]) => ensureUserDocument(...args),
}));

const canUserScan = vi.fn();
const incrementScanCount = vi.fn();
const logTokenConsumption = vi.fn();
vi.mock("@/lib/supabase/usage", () => ({
  canUserScan: (...args: unknown[]) => canUserScan(...args),
  incrementScanCount: (...args: unknown[]) => incrementScanCount(...args),
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
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { status: "active" }, error: null }),
        }),
      }),
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
  canUserScan.mockResolvedValue(true);
  scanTimesheetWithGemini.mockResolvedValue(JSON.stringify(VALID_SCAN_RESULT));
  getClientIp.mockReturnValue("203.0.113.1");
  reserveGuestScan.mockResolvedValue({ allowed: true, remaining: 0 });
  getCloudflareContext.mockResolvedValue({ env: { RATE_LIMIT_KV: FAKE_KV } });
});

describe("POST /api/scan-timesheet — C-2: X-Guest-Mode ヘッダーだけでゲスト経路に落とせない", () => {
  it("C-2 中核: 有効なセッション Cookie を持つユーザー (Authorization ヘッダーは無い) が X-Guest-Mode: true を送っても、認証済み経路 (canUserScan/incrementScanCount) を通り、ゲスト経路 (reserveGuestScan) を経由しない", async () => {
    // 認証は Cookie 経由で成立している想定 (mockAuthenticatedSession, beforeEach 既定)。
    // web クライアントの正規の認証方式であり Authorization ヘッダーは付与しない。
    await POST(
      makeRequest({
        "Content-Type": "application/json",
        "X-Guest-Mode": "true",
      }),
    );

    expect(canUserScan).toHaveBeenCalled();
    expect(canUserScan.mock.calls[0]?.[1]).toBe(AUTH_UID);
    expect(incrementScanCount).toHaveBeenCalledWith(expect.anything(), AUTH_UID);

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

    expect(canUserScan).toHaveBeenCalledWith(
      expect.anything(),
      AUTH_UID,
      expect.anything(),
      expect.anything(),
      null, // ensureUserDocument モックの premiumExpiresAt は null が正当値
    );
    expect(incrementScanCount).toHaveBeenCalledWith(expect.anything(), AUTH_UID);
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
    expect(canUserScan).not.toHaveBeenCalled();
    expect(incrementScanCount).not.toHaveBeenCalled();
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
    expect(incrementScanCount).not.toHaveBeenCalled();
  });

  it("回帰: X-Guest-Mode ヘッダーが無く、Cookie 認証が成立している通常リクエストは、これまで通り認証済み経路を通る", async () => {
    await POST(
      makeRequest({
        "Content-Type": "application/json",
      }),
    );

    expect(canUserScan).toHaveBeenCalled();
    expect(incrementScanCount).toHaveBeenCalledWith(expect.anything(), AUTH_UID);
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
    expect(canUserScan).not.toHaveBeenCalled();
    expect(incrementScanCount).not.toHaveBeenCalled();
    expect(reserveGuestScan).not.toHaveBeenCalled();
  });
});
