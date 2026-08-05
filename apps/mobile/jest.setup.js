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

jest.mock("react-native-google-mobile-ads", () => ({
  __esModule: true,
  default: () => ({ initialize: jest.fn() }),
  RewardedAd: { createForAdRequest: jest.fn() },
  RewardedAdEventType: {},
  TestIds: {},
}));
