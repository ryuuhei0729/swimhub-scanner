/**
 * Sprint Contract テストスケルトン
 * タスク: swimhub-scanner mobile Android 対応 - RevenueCat Platform 分岐
 *
 * NOTE: このファイルはスケルトンのみ。
 * - mobile アプリには Jest/Vitest が未セットアップ (package.json に test スクリプトなし、
 *   devDependencies にテストフレームワーク未記載)。
 * - Phase B では Developer がテスト基盤 (jest + @testing-library/react-native +
 *   jest-expo preset) を追加した後、このスケルトンを実装する。
 *
 * テスト対象の関数シグネチャ (実装後に import する):
 *   import { initRevenueCat } from "@/lib/revenucat";
 *   import { env } from "@/lib/env";
 *
 * 想定モック方針:
 *   - `react-native` の Platform.OS を jest.mock でオーバーライド
 *   - `react-native-purchases` の Purchases.configure をスパイ
 *   - `@/lib/env` をモックして API キーを制御
 *   - 各テストケース前に isInitialized リセット (モジュール再ロードまたは
 *     内部リセット用エクスポートが必要)
 */

// --- 必要になるモック宣言 (実装時にコメント解除) ---

// jest.mock("react-native-purchases", () => ({
//   __esModule: true,
//   default: {
//     configure: jest.fn(),
//     logIn: jest.fn(),
//     logOut: jest.fn(),
//     getOfferings: jest.fn(),
//     purchasePackage: jest.fn(),
//     restorePurchases: jest.fn(),
//     getCustomerInfo: jest.fn(),
//     addCustomerInfoUpdateListener: jest.fn(),
//     removeCustomerInfoUpdateListener: jest.fn(),
//   },
// }));

// const mockPurchasesConfigure = jest.spyOn(Purchases, "configure");

// --- Platform モック切り替えヘルパー ---
// const setPlatform = (os: "ios" | "android") => {
//   jest.resetModules();
//   jest.mock("react-native", () => ({
//     Platform: { OS: os, select: (obj: Record<string, unknown>) => obj[os] ?? obj.default },
//   }));
// };

// ============================================================
// [V-01] env.ts: revenuecatAndroidApiKey フィールドの存在確認
// ============================================================
describe("env.ts - revenuecatAndroidApiKey フィールド", () => {
  it("should export revenuecatAndroidApiKey field", () => {
    // Given: env モジュールをロードする
    // When: env.revenuecatAndroidApiKey を参照する
    // Then: フィールドが存在し、string 型であること
    // (undefined ではなく "" を返すこと)
    //
    // import { env } from "@/lib/env";
    // expect(typeof env.revenuecatAndroidApiKey).toBe("string");
  });

  it("should default to empty string when EXPO_PUBLIC_REVENUCAT_ANDROID_API_KEY is unset", () => {
    // Given: 環境変数 EXPO_PUBLIC_REVENUCAT_ANDROID_API_KEY が未設定
    // When: env.revenuecatAndroidApiKey を参照する
    // Then: "" (空文字) を返すこと
    //
    // delete process.env.EXPO_PUBLIC_REVENUCAT_ANDROID_API_KEY;
    // jest.resetModules();
    // const { env } = await import("@/lib/env");
    // expect(env.revenuecatAndroidApiKey).toBe("");
  });
});

// ============================================================
// [V-02] revenucat.ts: Platform.OS !== "ios" ガードの排除確認
// ============================================================
describe("revenucat.ts - Platform.OS !== 'ios' ガードが残っていないこと", () => {
  it("should NOT have Platform.OS !== 'ios' guard in initRevenueCat (Android path reachable)", () => {
    // このテストはソースコード静的チェックで補完する。
    // 動的確認: Android で有効なキーがあれば configure が呼ばれること。
    //
    // Given: Platform.OS = "android", env.revenuecatAndroidApiKey = "goog_valid_key"
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が { apiKey: "goog_valid_key" } で呼ばれること
    //
    // setPlatform("android");
    // jest.mock("@/lib/env", () => ({ env: { revenuecatAndroidApiKey: "goog_valid_key", revenuecatIosApiKey: "" } }));
    // const { initRevenueCat } = await import("@/lib/revenucat");
    // await initRevenueCat();
    // expect(mockPurchasesConfigure).toHaveBeenCalledWith({ apiKey: "goog_valid_key" });
  });
});

// ============================================================
// [V-03] Android + 有効な goog_ キー → configure が呼ばれる
// ============================================================
describe("initRevenueCat - Android, 有効な goog_ キー", () => {
  it("should call Purchases.configure with goog_ key on Android", async () => {
    // Given: Platform.OS = "android"
    //        env.revenuecatAndroidApiKey = "goog_test_valid_key"
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が呼ばれること
    //       引数の apiKey が "goog_test_valid_key" であること
    //       isInitialized フラグが true になること (2回目の呼び出しで configure が呼ばれないことで確認)
  });

  it("should NOT call Purchases.configure twice (idempotent)", async () => {
    // Given: 上記の初期化済み状態
    // When: initRevenueCat() を再度呼ぶ
    // Then: Purchases.configure の呼び出し回数が増えないこと
  });
});

// ============================================================
// [V-04] Android + キー未設定 (空文字) → configure が呼ばれない
// ============================================================
describe("initRevenueCat - Android, キー未設定", () => {
  it("should NOT call Purchases.configure when Android key is empty string", async () => {
    // Given: Platform.OS = "android"
    //        env.revenuecatAndroidApiKey = "" (未設定)
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が呼ばれないこと
  });

  it("should NOT call Purchases.configure when Android key does not start with goog_", async () => {
    // Given: Platform.OS = "android"
    //        env.revenuecatAndroidApiKey = "appl_wrong_prefix" (iOS のキーを誤設定)
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が呼ばれないこと (prefix バリデーション)
  });

  it("should NOT call Purchases.configure when Android key is placeholder", async () => {
    // Given: Platform.OS = "android"
    //        env.revenuecatAndroidApiKey = "goog_PLACEHOLDER" (プレースホルダ)
    //        ※ swim-hub パターンでは prefix チェックのみなので "goog_PLACEHOLDER" は
    //          startsWith("goog_") = true → configure が呼ばれる。
    //          これが期待される挙動かどうかを Sprint Contract で確認すること。
    // Then: (挙動を Sprint Contract 合意後に記入)
  });
});

// ============================================================
// [V-05] iOS パスへの影響なし (回帰確認)
// ============================================================
describe("initRevenueCat - iOS, 既存パスの回帰確認", () => {
  it("should call Purchases.configure with appl_ key on iOS", async () => {
    // Given: Platform.OS = "ios"
    //        env.revenuecatIosApiKey = "appl_valid_ios_key"
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が { apiKey: "appl_valid_ios_key" } で呼ばれること
  });

  it("should NOT call Purchases.configure on iOS when iOS key is empty", async () => {
    // Given: Platform.OS = "ios"
    //        env.revenuecatIosApiKey = "" (未設定)
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が呼ばれないこと
  });

  it("should NOT call Purchases.configure on iOS with Android key even if set", async () => {
    // Given: Platform.OS = "ios"
    //        env.revenuecatIosApiKey = "" (未設定)
    //        env.revenuecatAndroidApiKey = "goog_valid_android_key" (設定済み)
    // When: initRevenueCat() を呼ぶ
    // Then: Purchases.configure が呼ばれないこと (Platform.select がiOSキーを選ぶため)
  });
});

// ============================================================
// [V-06] !isInitialized ガードで全関数が正しく no-op になる
// ============================================================
describe("revenucat 各関数 - 未初期化状態の no-op 確認", () => {
  it("loginRevenueCat should no-op when not initialized", async () => {
    // Given: isInitialized = false (キー未設定で configure が呼ばれなかった状態)
    // When: loginRevenueCat("user-123") を呼ぶ
    // Then: エラーが発生しないこと。Purchases.logIn が呼ばれないこと
  });

  it("getOfferings should return null when not initialized", async () => {
    // Given: isInitialized = false
    // When: getOfferings() を呼ぶ
    // Then: null を返すこと
  });

  it("addCustomerInfoListener should return no-op cleanup when not initialized", async () => {
    // Given: isInitialized = false
    // When: addCustomerInfoListener(jest.fn()) を呼ぶ
    // Then: 返り値が呼び出し可能な関数であること。呼び出してもエラーが発生しないこと
  });
});

// ============================================================
// [V-07] account.tsx: サブスクリプション管理URLのPlatform分岐
// ============================================================
describe("account.tsx - manageSubscription URL Platform 分岐", () => {
  // NOTE: React Native コンポーネントテストは jest-expo + @testing-library/react-native が必要
  // 環境未セットアップのため、下記は Phase B 実装時のスケルトン

  it("should open apps.apple.com on iOS when manage subscription is pressed", () => {
    // Given: Platform.OS = "ios"
    //        Linking.openURL をモック
    // When: AccountScreen をレンダリングし、"サブスクリプション管理" ボタンをタップ
    // Then: Linking.openURL が "https://apps.apple.com/account/subscriptions" で呼ばれること
    //
    // const mockOpenURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    // render(<AccountScreen />);
    // fireEvent.press(screen.getByText(/* i18n key: accountScreen.manageSubscription */));
    // expect(mockOpenURL).toHaveBeenCalledWith("https://apps.apple.com/account/subscriptions");
  });

  it("should open play.google.com on Android when manage subscription is pressed", () => {
    // Given: Platform.OS = "android"
    //        Linking.openURL をモック
    // When: AccountScreen をレンダリングし、"サブスクリプション管理" ボタンをタップ
    // Then: Linking.openURL が "https://play.google.com/store/account/subscriptions" で呼ばれること
    //
    // setPlatform("android");
    // const mockOpenURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    // render(<AccountScreen />);
    // fireEvent.press(screen.getByText(/* i18n key: accountScreen.manageSubscription */));
    // expect(mockOpenURL).toHaveBeenCalledWith("https://play.google.com/store/account/subscriptions");
  });
});
