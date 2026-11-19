// LoginForm の「直近で利用」バッジ: Cookie に記録された手法のボタンにだけ付き、
// バッジは aria-hidden でボタンの aria-describedby から説明として参照される。
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    enterGuestMode: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: "ja" }),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { LoginForm } from "../LoginForm";

function setCookie(value: string) {
  document.cookie = `swimhub_last_login_method=${value}; Path=/`;
}

afterEach(() => {
  document.cookie = "swimhub_last_login_method=; Path=/; Max-Age=0";
});

describe("LoginForm — 直近で利用バッジ", () => {
  it("記録が無ければバッジを出さない", () => {
    render(<LoginForm />);
    expect(screen.queryByText("auth.loginMethod.lastUsed")).toBeNull();
  });

  it.each([
    ["google", "google-signin-button"],
    ["apple", "apple-signin-button"],
    ["email", "email-submit-button"],
  ])(
    "%s が記録されていればそのボタンにだけ付き、aria-describedby で結びつく",
    (method, buttonId) => {
      setCookie(method);
      render(<LoginForm />);
      const badges = screen.getAllByText("auth.loginMethod.lastUsed");
      expect(badges).toHaveLength(1);
      const badge = badges[0]!;
      expect(badge).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByTestId(buttonId)).toHaveAttribute("aria-describedby", badge.id);
    },
  );

  it("新規登録モードでは出さない", () => {
    setCookie("google");
    render(<LoginForm />);
    expect(screen.getByText("auth.loginMethod.lastUsed")).toBeInTheDocument();
    fireEvent.click(screen.getByText("auth.noAccount"));
    expect(screen.queryByText("auth.loginMethod.lastUsed")).toBeNull();
    expect(screen.getByTestId("google-signin-button")).not.toHaveAttribute("aria-describedby");
  });
});
