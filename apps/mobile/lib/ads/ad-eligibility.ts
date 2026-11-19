import { PLAN_LIMITS, isActivePremium } from "@swimhub-scanner/shared";
import type { UserStatusResponse } from "@swimhub-scanner/shared";

export interface AdEligibilityInput {
  /** AuthProvider の subscription（Supabase / RevenueCat 由来）から判定した Premium 状態 */
  isPremium: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  /** サーバーの利用状況 API の結果。未取得・取得失敗の場合は null */
  userStatus: UserStatusResponse | null;
}

/**
 * このユーザーに広告を出してよいか。
 *
 * 有料ユーザーに広告を出すのは苦情・返金の原因になるため「プランが確定していない間は
 * 出さない」側に倒す。ログインユーザーは AuthProvider の subscription が取得失敗で
 * null（= 非 Premium 扱い）になりうるため、サーバーの利用状況 API でも Premium でない
 * ことを確認できた場合にのみ広告対象とする。
 */
export function shouldShowAds({
  isPremium,
  isGuest,
  isAuthenticated,
  userStatus,
}: AdEligibilityInput): boolean {
  if (isPremium) return false;
  if (isGuest) return PLAN_LIMITS.guest.showAds;
  if (!isAuthenticated) return false;
  if (!userStatus) return false;
  // 実効プラン: 有効な Premium 以外（期限切れ・解約済みの premium 含む）は free 扱い
  const effectivePlan = isActivePremium(
    userStatus.plan,
    userStatus.subscriptionStatus,
    userStatus.premiumExpiresAt,
  )
    ? "premium"
    : "free";
  return PLAN_LIMITS[effectivePlan].showAds;
}
