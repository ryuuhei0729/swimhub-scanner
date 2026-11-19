import type { UserStatusResponse } from "@swimhub-scanner/shared";
import { shouldShowAds } from "../ad-eligibility";

function status(overrides: Partial<UserStatusResponse> = {}): UserStatusResponse {
  return {
    plan: "free",
    premiumExpiresAt: null,
    todayScanCount: 0,
    dailyLimit: 1,
    maxSwimmers: null,
    canScan: true,
    remainingScans: 1,
    subscriptionStatus: null,
    tokensUsedToday: 0,
    tokensRemaining: 1,
    ...overrides,
  };
}

const base = { isPremium: false, isGuest: false, isAuthenticated: true, userStatus: status() };

describe("shouldShowAds", () => {
  it("ゲストには広告を出す", () => {
    expect(
      shouldShowAds({ isPremium: false, isGuest: true, isAuthenticated: false, userStatus: null }),
    ).toBe(true);
  });

  it("サーバーで free と確認できたログインユーザーには広告を出す", () => {
    expect(shouldShowAds(base)).toBe(true);
  });

  it("subscription が Premium なら出さない", () => {
    expect(shouldShowAds({ ...base, isPremium: true })).toBe(false);
  });

  it("subscription の取得に失敗していても、サーバーが Premium と返したら出さない", () => {
    expect(
      shouldShowAds({
        ...base,
        userStatus: status({ plan: "premium", subscriptionStatus: "active" }),
      }),
    ).toBe(false);
    expect(
      shouldShowAds({
        ...base,
        userStatus: status({ plan: "premium", subscriptionStatus: "trialing" }),
      }),
    ).toBe(false);
  });

  it("利用状況が未取得・取得失敗の間は出さない（プラン不明）", () => {
    expect(shouldShowAds({ ...base, userStatus: null })).toBe(false);
  });

  it("期限切れの Premium は free 扱いで広告を出す", () => {
    expect(
      shouldShowAds({
        ...base,
        userStatus: status({
          plan: "premium",
          subscriptionStatus: "active",
          premiumExpiresAt: "2000-01-01T00:00:00Z",
        }),
      }),
    ).toBe(true);
  });

  it("未ログインかつゲストでもない場合は出さない", () => {
    expect(
      shouldShowAds({ isPremium: false, isGuest: false, isAuthenticated: false, userStatus: null }),
    ).toBe(false);
  });
});
