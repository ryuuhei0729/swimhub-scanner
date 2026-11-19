/**
 * get-started 画面の戻るボタン
 * 起動直後は AuthGate が router.replace で表示するため戻り先が無く、戻るボタンを出しても
 * 何も起きない。戻り先がある時（push で来た時）だけ表示することを確認する。
 */
import { render, screen, fireEvent } from "@testing-library/react-native";
import GetStartedScreen from "../app/(auth)/get-started";

const mockBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    push: jest.fn(),
    replace: jest.fn(),
  }),
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
    isAvailable: false,
  }),
}));

jest.mock("@/contexts/AuthProvider", () => ({
  useAuth: () => ({ enterGuestMode: jest.fn() }),
}));

describe("GetStartedScreen の戻るボタン", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("起動直後（戻り先が無い）は戻るボタンを表示しない", async () => {
    mockCanGoBack.mockReturnValue(false);
    await render(<GetStartedScreen />);

    expect(screen.queryByTestId("get-started-back-button")).toBeNull();
    // 画面自体は表示されている
    expect(screen.getByTestId("get-started-guest-button")).toBeTruthy();
  });

  it("他画面から遷移してきた（戻り先がある）場合は表示し、押すと戻る", async () => {
    mockCanGoBack.mockReturnValue(true);
    await render(<GetStartedScreen />);

    fireEvent.press(screen.getByTestId("get-started-back-button"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
