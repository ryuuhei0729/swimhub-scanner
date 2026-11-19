/**
 * ログイン手法選択画面の「直近で利用」バッジ:
 * 記録された手法のボタンにだけバッジが付き、読み上げラベルに「直近で利用」が含まれる。
 * ((app)/login-method は (auth)/login-method の再エクスポートなので両方これで担保される)
 */
import React from "react";
import { render, screen } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSegments: () => ["(auth)"],
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/hooks/useGoogleAuth", () => ({
  useGoogleAuth: () => ({
    signInWithGoogle: jest.fn(),
    loading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));
jest.mock("@/hooks/useAppleAuth", () => ({
  useAppleAuth: () => ({
    signInWithApple: jest.fn(),
    loading: false,
    error: null,
    clearError: jest.fn(),
    isAvailable: true,
  }),
}));

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginMethodScreen from "../app/(auth)/login-method";

describe("LoginMethodScreen — 直近で利用バッジ", () => {
  const originalOS = Platform.OS;
  beforeAll(() => {
    // AppleLoginButton は iOS 以外では描画しない
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
  });
  afterAll(() => {
    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("記録が無ければバッジを出さない", async () => {
    await render(<LoginMethodScreen />);
    // 読み込み完了を待つ (Email ボタンは常にある)
    await screen.findByLabelText("auth.loginMethod.withEmail");
    expect(
      screen.queryByText("auth.loginMethod.lastUsed", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it.each([
    ["apple", "auth.loginMethod.withApple", "login-last-used-apple"],
    ["google", "auth.loginMethod.withGoogle", "login-last-used-google"],
    ["email", "auth.loginMethod.withEmail", "login-last-used-email"],
  ])(
    "%s が記録されていれば該当ボタンにバッジが付き、読み上げラベルに含まれる",
    async (method, label, badgeId) => {
      await AsyncStorage.setItem("last-login-method", method);
      await render(<LoginMethodScreen />);
      const hidden = { includeHiddenElements: true };
      expect(await screen.findByTestId(badgeId, hidden)).toBeTruthy();
      expect(screen.getAllByText("auth.loginMethod.lastUsed", hidden)).toHaveLength(1);
      // バッジ自体は読み上げ対象外で、ボタンの読み上げラベルに含まれる
      expect(screen.queryByTestId(badgeId)).toBeNull();
      expect(screen.getByLabelText(`${label}, auth.loginMethod.lastUsed`)).toBeTruthy();
    },
  );
});
