/**
 * QA Phase B — 復旧経路バグ修正の検証 (最重要)。
 *
 * バグ: app/_layout.tsx は `isOAuthCallback` (hostname==="auth" && path==="callback") なら
 * 常に early return していたため、useGoogleAuth の openAuthSessionAsync が URL を返さず
 * 解決した場合 (アプリ kill、Android で Custom Tabs 復帰が新規 Intent になるケース) に
 * サインインが無症状に失敗し、復旧手段が無かった。
 *
 * 修正: early return を撤去し、共有パッケージ (@ryuuhei0729/swimhub-oauth) の
 * claimOAuthCode を通した安全網を実装:
 *   - claimed:false → 何もしない (warm path が処理中/処理済み)
 *   - claimed:true  → exchangeCodeForSession 実行 → 失敗なら claim.resolve({success:false})、
 *                      成功なら claim.resolve({success:true})
 *   - 失敗時にユーザー通知はしない (warm path が既にエラー表示済みのため二重通知防止、PM判断)
 *
 * トートロジー回避方針:
 * - hooks/useGoogleAuth.ts / lib/google-auth.ts (実体は @ryuuhei0729/swimhub-oauth/mobile) は
 *   モックせず実物を使う。claimOAuthCode はモジュールスコープで状態を共有する実装のため、
 *   モックすると「warm path と安全網が同じ code を奪い合う」という検証したい現象自体が
 *   再現できなくなる。
 * - モックするのは外側の境界 (expo-web-browser の openAuthSessionAsync の戻り値、
 *   supabase.auth.* の戻り値、expo-linking の Linking イベント発火) のみ。
 * - claim.resolve が実際に呼ばれたかどうかは、実装のプライベートな内部状態を読むのではなく
 *   「同じ code で claimOAuthCode をもう一度呼んだ (負けた) 側の Promise が実際に解決するか」
 *   をタイムアウト付きで観測することで検証する (呼ばれていなければ Promise は永久に pending
 *   のままになり、これは共有パッケージ構築時に実際に踏んだ退行そのもの)。
 */
import React from "react";
import { render, renderHook, act, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import RootLayout from "../app/_layout";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { claimOAuthCode } from "../lib/google-auth";
import { supabase } from "../lib/supabase";

jest.mock("expo-router", () => ({
  Slot: () => null,
  useRouter: () => ({ replace: jest.fn() }),
  useSegments: () => [],
}));

jest.mock("expo-font", () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@expo-google-fonts/chakra-petch", () => ({
  ChakraPetch_700Bold: "mock-font-asset",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../lib/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock("../contexts/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isGuest: true,
    loading: false,
    transitioning: false,
    pendingRecoveryCheck: false,
    setPendingRecoveryCheck: jest.fn(),
  }),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "swimhub-scanner://auth/callback"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// 実際の RootLayout / useGoogleAuth が同一の supabase インスタンス (同一の
// exchangeCodeForSession モック) を参照するよう共有する。
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      verifyOtp: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

// hostname/path も本物同様に返す最小実装 (authDeepLinkTokenHash.test.tsx と同じ方針)。
// scheme://auth/callback?code=... → hostname:"auth", path:"callback"
jest.mock("expo-linking", () => {
  const state: { url: string | null } = { url: null };
  let urlHandler: ((e: { url: string }) => void) | null = null;
  return {
    parse: jest.fn((url: string) => {
      const query = url.split("?")[1]?.split("#")[0] ?? "";
      const params = new URLSearchParams(query);
      const afterScheme = url.split("://")[1] ?? "";
      const withoutQuery = afterScheme.split("?")[0] ?? "";
      const segments = withoutQuery.split("/").filter(Boolean);
      const hostname = segments[0] ?? null;
      const path = segments.length > 1 ? segments.slice(1).join("/") : null;
      return { hostname, path, queryParams: Object.fromEntries(params.entries()) };
    }),
    getInitialURL: jest.fn(() => Promise.resolve(state.url)),
    addEventListener: jest.fn((_event: string, handler: (e: { url: string }) => void) => {
      urlHandler = handler;
      return { remove: jest.fn() };
    }),
    __setInitialUrl: (url: string | null) => {
      state.url = url;
    },
    __fireUrl: (url: string) => {
      urlHandler?.({ url });
    },
  };
});

const mockExchangeCodeForSession = supabase!.auth.exchangeCodeForSession as jest.Mock;
const mockSignInWithOAuth = supabase!.auth.signInWithOAuth as jest.Mock;
const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.Mock;
const setInitialUrl = (Linking as unknown as { __setInitialUrl: (url: string | null) => void })
  .__setInitialUrl;
const fireUrl = (Linking as unknown as { __fireUrl: (url: string) => void }).__fireUrl;

/** claim.resolve が実際に呼ばれたかを、負けた側の Promise が解決するかで観測する。
 * 呼ばれていなければ永久に pending のままになるため、タイムアウトで検出する。 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timeout: ${label} が解決しませんでした (claim.resolve 未呼び出しの疑い)`)), ms);
    }),
  ]);
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  setInitialUrl(null);
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockSignInWithOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/o/oauth2/mock-auth" },
    error: null,
  });
  // session を持たせる: 共有パッケージは exchangeCodeForSession がエラー無しで session を
  // 返さないケースを失敗として扱う。
  mockExchangeCodeForSession.mockResolvedValue({
    data: { session: { access_token: "mock-access-token" } },
    error: null,
  });
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe("復旧経路 (安全網) — 実際に機能すること", () => {
  it("[最重要-1] openAuthSessionAsync が URL なしで解決した後、グローバル Linking ハンドラに auth/callback?code=... が届くと exchangeCodeForSession が呼ばれてログインが成立する", async () => {
    const code = "safety-net-recovery-001";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    // Android で Custom Tabs 復帰が新規 Intent になり、openAuthSessionAsync が
    // URL を返さずに解決する (dismiss) ケースを再現する。
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "dismiss" });
    const { result } = await renderHook(() => useGoogleAuth());

    let warmPathResult: { success: boolean; error?: Error | null } | undefined;
    await act(async () => {
      warmPathResult = await result.current.signInWithGoogle();
    });

    // dismiss 経路では code 自体を読んでいないため warm path 側は claim も交換もしない。
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(warmPathResult?.success).toBe(false);

    // 直後に OS が同じコールバック URL を Linking の 'url' イベントとして配送する
    // (_layout.tsx の安全網が受信するケース)。
    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith(code);

    // 安全網が実際にこの code を claim して成功させたことを確認する
    // (もう一度 claimOAuthCode を呼ぶと「敗者」になり、勝者の実際の結果を引き継ぐ)。
    const loserOutcome = claimOAuthCode(code);
    expect(loserOutcome.claimed).toBe(false);
    if (!loserOutcome.claimed) {
      await expect(withTimeout(loserOutcome.result, 500, "loserOutcome.result")).resolves.toEqual({
        success: true,
      });
    }
  });

  it("[最重要-2] 二重交換防止: 同一 code が warm path とグローバルハンドラの両方に届いても exchangeCodeForSession は1回だけ呼ばれる", async () => {
    const code = "safety-net-dedup-002";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    // 1. warm path (useGoogleAuth) が先に code を交換する。
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "success", url: callbackUrl });
    const { result } = await renderHook(() => useGoogleAuth());

    let authResult: { success: boolean; error?: Error | null } | undefined;
    await act(async () => {
      authResult = await result.current.signInWithGoogle();
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith(code);
    expect(authResult).toEqual({ success: true });

    // preferEphemeralSession が browserOptions として引き継がれていること
    // (Cookie 分離挙動が変わるため落とすと 1:1 挙動が崩れる回帰ポイント)。
    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { preferEphemeralSession: true },
    );

    // 2. 直後に OS が同じコールバック URL を Linking の 'url' イベントとしても配送する。
    mockExchangeCodeForSession.mockClear();
    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // 既に warm path 側が claim 済みのため、安全網は何もしない (再交換なし)。
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("[最重要-3] claimed:false のとき安全網は何もしない (既に claim 済みの code では exchangeCodeForSession を呼ばない)", async () => {
    const code = "safety-net-already-claimed-003";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    // 他所 (ここではテストコード自身) が先にこの code を claim 済みの状態を作る。
    const winnerClaim = claimOAuthCode(code);
    expect(winnerClaim.claimed).toBe(true);

    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // 安全網は claimed:false を得るため何もしない。
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    // このテストが claim を消費したままにしないよう後始末する
    // (claimedOAuthCodes はモジュールスコープで永続するため、テスト間の
    // code 文字列は常に一意にすること)。
    if (winnerClaim.claimed) winnerClaim.resolve({ success: true });
  });

  it("[最重要-4a] 失敗時 (error あり) も claim.resolve が必ず呼ばれる (呼ばないと敗者が永久にハングする)", async () => {
    const code = "safety-net-fail-with-error-004a";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "invalid_grant" },
    });

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);

    // 敗者側 (2回目の claimOAuthCode 呼び出し) がハングせず失敗を受け取れること。
    const loserOutcome = claimOAuthCode(code);
    expect(loserOutcome.claimed).toBe(false);
    if (!loserOutcome.claimed) {
      await expect(withTimeout(loserOutcome.result, 500, "loserOutcome.result (error あり)")).resolves.toEqual({
        success: false,
      });
    }

    // PM 判断: 失敗時にユーザー通知 (Alert) は出さない (warm path 側が既に表示済みのため)。
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("[最重要-4b] 失敗時 (error:null かつ session なし) も claim.resolve が必ず呼ばれる", async () => {
    const code = "safety-net-fail-no-session-004b";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    mockExchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: null });

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);

    const loserOutcome = claimOAuthCode(code);
    expect(loserOutcome.claimed).toBe(false);
    if (!loserOutcome.claimed) {
      await expect(
        withTimeout(loserOutcome.result, 500, "loserOutcome.result (error:null / session なし)"),
      ).resolves.toEqual({ success: false });
    }

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("[最重要-4c] 失敗時 (exchangeCodeForSession が例外を投げる) も claim.resolve が必ず呼ばれる", async () => {
    const code = "safety-net-fail-exception-004c";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    mockExchangeCodeForSession.mockRejectedValue(new Error("network down"));

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);

    const loserOutcome = claimOAuthCode(code);
    expect(loserOutcome.claimed).toBe(false);
    if (!loserOutcome.claimed) {
      await expect(
        withTimeout(loserOutcome.result, 500, "loserOutcome.result (例外)"),
      ).resolves.toEqual({ success: false });
    }

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("[逆方向の安全網] 安全網が先に code を claim して交換に失敗すると、後から届いた warm path 側も success:true を返さない", async () => {
    const code = "safety-net-layout-wins-then-fails-005";
    const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

    await render(<RootLayout />);
    await waitFor(() => {
      expect(Linking.addEventListener).toHaveBeenCalled();
    });

    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "invalid_grant" },
    });

    // 1. 安全網 (_layout.tsx) がグローバル Linking ハンドラ経由で先に claim し、交換に失敗する。
    await act(async () => {
      fireUrl(callbackUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);

    // 2. 直後に warm path (useGoogleAuth) にも同じ code が届くが、既に claim 済みなので
    //    自分では交換せず、安全網側の実際の (失敗という) 結果を引き継ぐ。
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "success", url: callbackUrl });
    const { result } = await renderHook(() => useGoogleAuth());

    let authResult: { success: boolean; error?: Error | null } | undefined;
    await act(async () => {
      authResult = await result.current.signInWithGoogle();
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(authResult?.success).toBe(false);
  });

  // 追記 (Reviewer 指摘対応): 人間の判断で「cold start のときだけ Alert で通知する」に変更された
  // (`isColdStart` 引数, Linking.getInitialURL 経由=true / addEventListener 経由=false)。
  // 上記の [最重要-*] は全て fireUrl (= addEventListener = isColdStart:false) 経由のみを
  // 叩いており、cold start 分岐は未検証だった。この2ケースでその穴を埋める。
  describe("cold start 分岐 (isColdStart) — Alert 通知の有無", () => {
    it("[cold start] getInitialURL 経由で auth/callback?code=... が届き交換に失敗すると、claim.resolve は必ず呼ばれた上で Alert.alert が1回呼ばれる", async () => {
      const code = "safety-net-coldstart-fail-006";
      const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

      // アプリ kill 後のコールドスタートを再現する: getInitialURL がこの URL を
      // 返す状態にしてから RootLayout をマウントする (addEventListener 経由の
      // fireUrl は使わない = isColdStart:true のパスだけを通す)。
      setInitialUrl(callbackUrl);
      mockExchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: "invalid_grant" },
      });

      await render(<RootLayout />);

      await waitFor(() => {
        expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
      });
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(code);

      // 敗者側 (2回目の claimOAuthCode) がハングしないこと = claim.resolve が
      // 呼ばれたことの証拠 (cold start パスでも先に resolve され、その後に
      // Alert が出る実装であることを間接的に固定する)。
      const loserOutcome = claimOAuthCode(code);
      expect(loserOutcome.claimed).toBe(false);
      if (!loserOutcome.claimed) {
        await expect(
          withTimeout(loserOutcome.result, 500, "loserOutcome.result (cold start 失敗)"),
        ).resolves.toEqual({ success: false });
      }

      // cold start (warm path の JS コンテキストが失われている) では、二重通知の
      // 心配が無いため Alert で明示的に失敗を伝える。
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith("common.error", "auth.errors.deepLinkFailed");
    });

    it("[warm, 明示化] addEventListener 経由 (isColdStart:false) で交換に失敗しても Alert.alert は呼ばれない (warm path が既に表示済みのため)", async () => {
      const code = "safety-net-warm-fail-explicit-007";
      const callbackUrl = `swimhub-scanner://auth/callback?code=${code}`;

      mockExchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: "invalid_grant" },
      });

      await render(<RootLayout />);
      await waitFor(() => {
        expect(Linking.addEventListener).toHaveBeenCalled();
      });

      // getInitialURL 側は null のまま (beforeEach で setInitialUrl(null) 済み)。
      // addEventListener 経由でのみこの code を届ける = isColdStart:false 固定。
      await act(async () => {
        fireUrl(callbackUrl);
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);

      const loserOutcome = claimOAuthCode(code);
      expect(loserOutcome.claimed).toBe(false);
      if (!loserOutcome.claimed) {
        await expect(
          withTimeout(loserOutcome.result, 500, "loserOutcome.result (warm 失敗, 明示ケース)"),
        ).resolves.toEqual({ success: false });
      }

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });
});
