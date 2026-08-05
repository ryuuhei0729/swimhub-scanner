/**
 * Sprint Contract テストスケルトン
 * タスク 1: scanner mobile paywall のゲストガード
 *
 * NOTE: このファイルはスケルトンのみ。
 * - jest-expo は導入済み。中身は未実装なので it.todo で意図のみ宣言している
 *   (空ボディの it() は常に green になり偽陽性になるため使わない)。
 * - React Native Testing Library (@testing-library/react-native) を想定。
 */

// import { render, screen, fireEvent } from "@testing-library/react-native";
// import PaywallScreen from "../app/(app)/paywall";

// --- モックヘルパー ---
// const mockRouterPush = jest.fn();
// const mockRouterBack = jest.fn();
// jest.mock("expo-router", () => ({
//   useRouter: () => ({ push: mockRouterPush, back: mockRouterBack }),
// }));
// jest.mock("@/lib/revenucat", () => ({
//   getOfferings: jest.fn().mockResolvedValue({ current: { monthly: mockPkg, annual: mockPkg } }),
//   purchasePackage: jest.fn(),
//   restorePurchases: jest.fn(),
// }));

// --- ゲスト状態のモック ---
// const guestAuthContext = {
//   subscription: null,
//   isGuest: true,
//   isAuthenticated: false,
//   refreshSubscription: jest.fn(),
// };

// --- Free ユーザーのモック ---
// const freeAuthContext = {
//   subscription: { plan: "free", status: null, ... },
//   isGuest: false,
//   isAuthenticated: true,
//   refreshSubscription: jest.fn(),
// };

describe("PaywallScreen (scanner) - ゲストガード", () => {
  describe("ゲスト状態 (isGuest === true)", () => {
    // [V-01] ゲスト時に購入ボタンが表示されないこと
    it.todo("should NOT render purchase button when isGuest is true");

    // [V-02] ゲスト時にログイン CTA が表示されること
    it.todo("should render login CTA when isGuest is true");

    // [V-03] ログイン CTA タップで /(auth)/login-method に遷移すること
    // scanner は login-method へ遷移 (timer の get-started と異なる点)
    it.todo("should navigate to /(auth)/login-method when login CTA is pressed");

    // [V-04] handlePurchase の防御ガードが機能すること
    it.todo("should NOT call purchasePackage even if handlePurchase is triggered directly");
  });

  describe("未認証・非ゲスト状態 (!isAuthenticated && !isGuest)", () => {
    // [V-05] 認証状態が不明な場合も購入ボタンを表示しないこと
    it.todo("should NOT render purchase button");
  });

  describe("Free ユーザー状態", () => {
    // [V-06] Free ユーザーには購入ボタンが表示されること (回帰確認)
    it.todo("should render purchase button for authenticated free user");

    // [V-07] 認証済みユーザーにはログイン CTA が表示されないこと
    it.todo("should NOT render login CTA for authenticated user");
  });

  describe("Premium ユーザー状態", () => {
    // [V-08] Premium ユーザーには購入ボタンが表示されないこと
    it.todo("should render already-premium message and NOT render purchase button");
  });
});
