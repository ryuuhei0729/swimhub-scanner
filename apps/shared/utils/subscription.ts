import type { UserPlan, SubscriptionStatus, SubscriptionInfo } from "../types/auth";

export function isActivePremium(
  plan: UserPlan,
  status: SubscriptionStatus | null,
  premiumExpiresAt?: string | null,
): boolean {
  if (plan !== "premium") return false;
  if (status !== "active" && status !== "trialing") return false;
  if (premiumExpiresAt && new Date(premiumExpiresAt) <= new Date()) return false;
  return true;
}

// swim-hub の checkIsPremium と同一ロジック・同一シグネチャ
export function checkIsPremium(subscription: SubscriptionInfo | null): boolean {
  if (!subscription) return false;
  return isActivePremium(subscription.plan, subscription.status, subscription.premiumExpiresAt);
}
