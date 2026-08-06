/**
 * QA Phase B: RootLayout(AuthGate) の handleAuthDeepLink (app/_layout.tsx, 非 export の
 * 内部関数) が token_hash + type クエリを検知して supabase.auth.verifyOtp を呼び出すこと、
 * および既存の code (PKCE) 経路が壊れていないことを、実コンポーネントのマウント経由で検証する。
 *
 * handleAuthDeepLink 自体は export されていないため直接 import できない。RootLayout を
 * マウントし、Linking.getInitialURL が解決した URL をトリガーとして実行される副作用
 * (supabase.auth.verifyOtp / exchangeCodeForSession 呼び出し) を観測することで間接的に
 * 検証する (トートロジー回避: token_hash 抽出/type 判定ロジックをテストファイル内で
 * 再実装しない。lib/auth-deep-link.ts の実装をそのまま使わせる)。
 *
 * 手法は swimhub-timer/apps/mobile/__tests__/rootLayoutAuthDeepLink.test.tsx を踏襲するが、
 * scanner の app/_layout.tsx は timer と異なり、OAuth コールバック判定を
 * `Linking.parse(url).hostname === "auth" && path === "callback"` の構造化フィールドで
 * 行う (timer は `url.includes("auth/callback")` という文字列判定)。そのため expo-linking の
 * `parse` モックは queryParams だけでなく hostname/path も本物同様に返す必要がある
 * (下記 parseMock 参照)。
 *
 * Sprint Contract: V-04/V-07 相当 (token_hash 優先, code フロー非破壊)。
 */
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import RootLayout from "../app/_layout";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthProvider";

jest.mock("expo-router", () => ({
  Slot: () => null,
  useRouter: jest.fn(),
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

// app/_layout.tsx が `../lib/i18n` (i18next インスタンス) を side-effect import する。
// 実物は expo-localization (getLocales) に依存し jest 環境では未セットアップのため
// クラッシュしうる。react-i18next 自体は上でモック済みで t しか使わないため、
// side-effect の中身は空のダミーで十分。
jest.mock("../lib/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock("../contexts/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn(),
}));

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      verifyOtp: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

// expo-linking の実装 (Linking.parse) は内部で expo-constants のマニフェスト情報に
// 依存しており jest 環境では例外を投げうる。handleAuthDeepLink は try/catch で
// 包んでいないため (parse 自体は auth-deep-link.ts 内で try/catch されるが、
// isOAuthCallback の判定は _layout.tsx が直接 Linking.parse を呼ぶ)、ここでは
// parse を「hostname/path/queryParams を返す最小実装」に差し替える。
// scheme://auth/callback?... → hostname:"auth", path:"callback"
// scheme://reset-password?... → hostname:"reset-password", path:null
// scheme://?...              → hostname:null, path:null (メール確認の bare scheme)
// (_layout.tsx 冒頭のコメントに書かれている expo-linking の実際の解釈と同じ)
jest.mock("expo-linking", () => {
  const state: { url: string | null } = { url: null };
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
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    __setInitialUrl: (url: string | null) => {
      state.url = url;
    },
  };
});

const mockVerifyOtp = supabase!.auth.verifyOtp as jest.Mock;
const mockExchangeCodeForSession = supabase!.auth.exchangeCodeForSession as jest.Mock;
const mockSetSession = supabase!.auth.setSession as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const setInitialUrl = (Linking as unknown as { __setInitialUrl: (url: string | null) => void })
  .__setInitialUrl;

const mockRouterReplace = jest.fn();
const mockSetPendingRecoveryCheck = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  setInitialUrl(null);
  mockVerifyOtp.mockResolvedValue({ data: {}, error: null });
  mockExchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
  mockSetSession.mockResolvedValue({ data: {}, error: null });
  mockUseRouter.mockReturnValue({ replace: mockRouterReplace });
  mockUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isGuest: true,
    loading: false,
    transitioning: false,
    pendingRecoveryCheck: false,
    setPendingRecoveryCheck: mockSetPendingRecoveryCheck,
  });
});

describe("RootLayout(AuthGate) — handleAuthDeepLink token_hash 分岐", () => {
  it("SC-01: token_hash + type=signup → verifyOtp が呼ばれ、成功時は特に画面遷移しない (exchangeCodeForSession は呼ばれない)", async () => {
    // 実際の emailRedirectTo は bare scheme "swimhub-scanner://" (contexts/AuthProvider.tsx)
    setInitialUrl("swimhub-scanner://?token_hash=abc123&type=signup");
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "abc123" });
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("SC-02: token_hash + type=recovery → setPendingRecoveryCheck(true) → verifyOtp 成功 → router.replace(\"/(auth)/reset-password\")", async () => {
    setInitialUrl("swimhub-scanner://reset-password?token_hash=abc123&type=recovery");
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc123" });
    });
    expect(mockSetPendingRecoveryCheck).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/reset-password");
    });
  });

  it("SC-03: token_hash + type=recovery で verifyOtp がエラー → setPendingRecoveryCheck(false) に戻り、reset-password へ遷移しない", async () => {
    mockVerifyOtp.mockResolvedValue({ data: null, error: { message: "expired" } });

    setInitialUrl("swimhub-scanner://reset-password?token_hash=expired&type=recovery");
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "expired" });
    });
    await waitFor(() => {
      expect(mockSetPendingRecoveryCheck).toHaveBeenCalledWith(false);
    });
    expect(mockRouterReplace).not.toHaveBeenCalledWith("/(auth)/reset-password");
  });

  it("SC-04: token_hash と code が両方ある URL では token_hash が優先され exchangeCodeForSession は呼ばれない (V-07)", async () => {
    setInitialUrl("swimhub-scanner://reset-password?token_hash=abc123&type=recovery&code=some-pkce-code");
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc123" });
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("SC-05: token_hash が無く code のみの URL では exchangeCodeForSession が呼ばれる (V-04: 既存 OAuth / PKCE 回帰)", async () => {
    setInitialUrl("swimhub-scanner://reset-password?code=some-pkce-code");
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("some-pkce-code");
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('SC-06: hostname==="auth" && path==="callback" (Google OAuth) の URL では token_hash が無視される (verifyOtp は呼ばれない)。安全網により code があれば exchangeCodeForSession は呼ばれる', async () => {
    // NOTE: 今回の安全網修正により、この URL 形状はもはや「完全に無視」ではなく
    // claimOAuthCode 経由の安全網処理に入る (詳細は oauthCallbackSafetyNet.test.tsx)。
    // ここで固定したいのは「token_hash 抽出ロジックには絶対に渡らない」という一点。
    setInitialUrl("swimhub-scanner://auth/callback?token_hash=abc123&type=signup&code=oauth-code-001");
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("oauth-code-001");
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("SC-07: 同一 token_hash を含む URL が2回処理されても verifyOtp は1回しか呼ばれない (processedCodesRef による重複排除)", async () => {
    const url = "swimhub-scanner://?token_hash=dup-hash-001&type=signup";
    setInitialUrl(url);
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledTimes(1);
    });

    const listenerCalls = (Linking.addEventListener as jest.Mock).mock.calls as [
      string,
      (e: { url: string }) => void,
    ][];
    const urlHandler = listenerCalls.find(([eventName]) => eventName === "url")?.[1];
    expect(urlHandler).toBeDefined();

    mockVerifyOtp.mockClear();
    await urlHandler!({ url });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("SC-08: 境界値: token_hash はあるが type が未知の値 → extractTokenHash が null を返し、code 分岐にもフォールバックしない (type なしとして無視される)", async () => {
    setInitialUrl("swimhub-scanner://?token_hash=abc123&type=unknown-type");
    await render(<RootLayout />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("回帰: auth/callback を含まない完全に無関係な URL では verifyOtp も exchangeCodeForSession も呼ばれない", async () => {
    setInitialUrl("swimhub-scanner://some/other/path");
    await render(<RootLayout />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("境界値: token_hash が空文字の場合は verifyOtp を呼ばず code フローにもフォールバックしない (type だけでは起動しない)", async () => {
    setInitialUrl("swimhub-scanner://?token_hash=&type=signup");
    await render(<RootLayout />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("PM依頼4-2 相当: 同一 code (非 OAuth callback パス) を含む URL を2回連続で流しても exchangeCodeForSession は1回だけ呼ばれる", async () => {
    const url = "swimhub-scanner://reset-password?code=dup-guard-code-001";
    setInitialUrl(url);
    await render(<RootLayout />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
    });
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("dup-guard-code-001");

    const listenerCalls = (Linking.addEventListener as jest.Mock).mock.calls as [
      string,
      (e: { url: string }) => void,
    ][];
    const urlHandler = listenerCalls.find(([eventName]) => eventName === "url")?.[1];
    expect(urlHandler).toBeDefined();

    mockExchangeCodeForSession.mockClear();
    await urlHandler!({ url });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });
});
