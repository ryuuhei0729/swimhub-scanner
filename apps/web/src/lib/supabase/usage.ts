import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayJST } from "@swimhub-scanner/shared/utils";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types";
import type { PlanType, SubscriptionStatus } from "@swimhub-scanner/shared/types/api";

const APP = "swimhub_scanner" as const;

/**
 * Get today's scan count for a user.
 */
export async function getTodayScanCount(supabase: SupabaseClient, uid: string): Promise<number> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    return 0;
  }

  const today = getTodayJST();
  const { data } = await supabase
    .from("app_daily_usage")
    .select("usage_count")
    .eq("user_id", uid)
    .eq("app", APP)
    .eq("usage_date", today)
    .single();

  return data?.usage_count ?? 0;
}

/**
 * Get today's total tokens used across all apps for a user.
 */
export async function getTodayTokensUsed(supabase: SupabaseClient, uid: string): Promise<number> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    return 0;
  }

  const today = getTodayJST();
  const { data } = await supabase
    .from("app_daily_usage")
    .select("daily_tokens_used")
    .eq("user_id", uid)
    .eq("usage_date", today);

  if (!data || data.length === 0) {
    return 0;
  }

  return data.reduce(
    (sum: number, row: { daily_tokens_used: number | null }) => sum + (row.daily_tokens_used ?? 0),
    0,
  );
}

/**
 * Check if a user can scan (has not exceeded daily limit).
 * Premium users (active/trialing subscription) always return true.
 * Free users are checked against daily_tokens_used.
 */
export async function canUserScan(
  supabase: SupabaseClient,
  uid: string,
  plan: PlanType,
  subscriptionStatus: SubscriptionStatus,
  premiumExpiresAt?: Date | null,
): Promise<boolean> {
  // Premium users with active subscription can always scan (unless expired)
  if (plan === "premium" && (subscriptionStatus === "active" || subscriptionStatus === "trialing")) {
    if (premiumExpiresAt && premiumExpiresAt <= new Date()) {
      // Premium has expired, fall through to free plan check
    } else {
      return true;
    }
  }

  const limits = PLAN_LIMITS[plan];
  if (limits.dailyScanLimit === null) {
    return true;
  }

  // Check daily tokens used across all apps
  const tokensUsed = await getTodayTokensUsed(supabase, uid);
  return tokensUsed < limits.dailyScanLimit;
}

/**
 * Increment the scan count and daily tokens used for today.
 *
 * app_daily_usage への直接 INSERT/UPDATE は RLS で拒否される (直接書き込みは
 * auth.uid() 検証込みの increment_daily_usage RPC に一本化済み)。エラーが
 * 発生した場合は無料枠のカウントが記録されず実質無制限化するため、握りつぶさず throw する。
 */
export async function incrementScanCount(supabase: SupabaseClient, uid: string): Promise<void> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    console.log("[DEV] Mock: incrementScanCount for", uid);
    return;
  }

  const today = getTodayJST();

  const { error } = await supabase.rpc("increment_daily_usage", {
    p_user_id: uid,
    p_app: APP,
    p_usage_date: today,
    p_last_used_at: new Date().toISOString(),
  });

  if (error) {
    console.error("increment_daily_usage failed:", error);
    throw error;
  }
}

/**
 * Log a token consumption event.
 */
export async function logTokenConsumption(
  supabase: SupabaseClient,
  uid: string,
  actionType: "scanner_scan",
  referenceId?: string,
): Promise<void> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    console.log("[DEV] Mock: logTokenConsumption for", uid, actionType);
    return;
  }

  await supabase.from("token_consumption_log").insert({
    user_id: uid,
    action_type: actionType,
    app: APP,
    reference_id: referenceId ?? null,
    consumed_at: new Date().toISOString(),
  });
}
