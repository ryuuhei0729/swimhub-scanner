/* Mocks for native modules so test files that import them don't crash on load.
 * Extend as component tests are implemented. Mirrors swimhub-timer's jest.setup.js
 * (same native module surface: react-native-purchases / react-native-google-mobile-ads). */

// scanner's app/_layout.tsx wraps the tree in GestureHandlerRootView (timer's does not),
// which calls a native `install()` on mount. Without this official mock, any test that
// mounts RootLayout crashes with "install is not a function".
require("react-native-gesture-handler/jestSetup");

// app/_layout.tsx also wraps the tree in SafeAreaProvider. The real native component
// never resolves initial insets under jest, so it renders zero children forever and any
// test mounting RootLayout would silently render an empty tree (no crash, no error — just
// none of AuthGate's effects, e.g. the Linking listeners under test, ever run). Use the
// package's own official jest mock instead of reimplementing this.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: "DEBUG" },
}));

// The mobileAds() instance is a shared singleton so tests can assert on
// initialize / setRequestConfiguration calls. Tests needing specific ad behaviour
// override InterstitialAd.createForAdRequest / AdsConsent.* per test.
jest.mock("react-native-google-mobile-ads", () => {
  const mobileAdsInstance = {
    initialize: jest.fn(() => Promise.resolve([])),
    setRequestConfiguration: jest.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    default: () => mobileAdsInstance,
    InterstitialAd: { createForAdRequest: jest.fn() },
    AdEventType: { LOADED: "loaded", ERROR: "error", OPENED: "opened", CLOSED: "closed", CLICKED: "clicked" },
    RewardedAd: { createForAdRequest: jest.fn() },
    RewardedAdEventType: {},
    MaxAdContentRating: { G: "G", PG: "PG", T: "T", MA: "MA" },
    AdsConsent: {
      gatherConsent: jest.fn(() => Promise.resolve({ canRequestAds: true })),
      getConsentInfo: jest.fn(() =>
        Promise.resolve({ canRequestAds: true, privacyOptionsRequirementStatus: "NOT_REQUIRED" }),
      ),
      showPrivacyOptionsForm: jest.fn(() => Promise.resolve({})),
    },
    TestIds: { INTERSTITIAL: "ca-app-pub-3940256099942544/4411468910" },
  };
});

// expo-store-review: ネイティブモジュールを読み込まない。既定は「使えない端末」
jest.mock("expo-store-review", () => ({
  isAvailableAsync: jest.fn(async () => false),
  requestReview: jest.fn(async () => {}),
}));

// AsyncStorage の native module は jest には無い。AuthProvider 等が lib/lastLoginMethod 経由で
// import するため、パッケージ公式の jest mock を全テスト共通で当てる
// (個別に別の挙動が必要なテストはファイル内の jest.mock で上書きできる)。
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
