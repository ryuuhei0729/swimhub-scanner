import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, ensureUserDocument } from "@/lib/api-helpers";
import { getTodayScanCount, getTodayTokensUsed } from "@/lib/supabase/usage";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types/plan";
import type { UserStatusResponse, SubscriptionStatus } from "@swimhub-scanner/shared/types/api";

export async function GET(request: NextRequest) {
  // 1. Auth check
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const {
    auth: { uid },
    supabase,
  } = authResult.result;

  // 2. Get user data
  const userDoc = await ensureUserDocument(supabase, uid);

  // 3. Get today's scan count
  const todayScanCount = await getTodayScanCount(supabase, uid);

  // 4. Get subscription status
  const { data: subData } = await supabase
    .from("user_subscriptions")
    .select("status")
    .eq("id", uid)
    .single();
  const subscriptionStatus: SubscriptionStatus = subData?.status ?? null;

  // 5. Get today's tokens used (across all apps)
  const tokensUsedToday = await getTodayTokensUsed(supabase, uid);

  // 6. Get plan limits
  const plan = userDoc.plan;
  const limits = PLAN_LIMITS[plan];

  // 7. Compute canScan, remainingScans, and tokensRemaining
  const isPremium = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const dailyLimit = limits.dailyScanLimit;

  // canScan: Premium always true, otherwise based on daily_tokens_used
  const canScan = isPremium || dailyLimit === null || tokensUsedToday < dailyLimit;
  const remainingScans =
    dailyLimit === null || isPremium ? null : Math.max(0, dailyLimit - todayScanCount);
  const tokensRemaining = isPremium ? null : Math.max(0, (dailyLimit ?? 1) - tokensUsedToday);

  // 8. Build response
  const response: UserStatusResponse = {
    plan,
    premiumExpiresAt: userDoc.premiumExpiresAt?.toISOString() ?? null,
    todayScanCount,
    dailyLimit,
    maxSwimmers: isPremium ? null : limits.maxSwimmers,
    canScan,
    remainingScans,
    subscriptionStatus,
    tokensUsedToday,
    tokensRemaining,
  };

  return NextResponse.json<UserStatusResponse>(response);
}
