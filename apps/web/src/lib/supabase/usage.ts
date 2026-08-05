import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayJST } from "@swimhub-scanner/shared/utils";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types";
import type { PlanType, SubscriptionStatus } from "@swimhub-scanner/shared/types/api";
import { createAdminClient } from "@/lib/supabase/server";

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

export interface ReserveScanResult {
  allowed: boolean;
  isPremium: boolean;
  tokensUsed: number;
}

/**
 * 認証済みユーザーの日次スキャン枠を原子的に予約する (Gemini 呼び出しの前に呼ぶこと)。
 *
 * canUserScan (読み取り) → Gemini 呼び出し (数秒) → incrementScanCount (加算) と
 * いう従来の構造では、読み取りと加算の間に競合窓があり、同一ユーザーが同時に
 * 2リクエストを送ると両方が「まだ枠が残っている」と判定できてしまう (C-4)。
 * このため service_role 限定の reserve_user_daily_usage RPC を使い、Premium
 * 判定 (関数内部で user_subscriptions から導出。apps/shared/utils/premium.ts の
 * checkIsPremium() と同一ロジック) と全アプリ横断の使用量加算を advisory lock で
 * 直列化した単一トランザクションで行う。予約後に Gemini 呼び出し等が失敗した場合は
 * releaseUserScan で解放すること。
 *
 * authenticated には EXECUTE 権限が無いため、ここでは anon key クライアントでは
 * なく service_role の管理者クライアントを使う。
 */
export async function reserveUserScan(uid: string): Promise<ReserveScanResult> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    return { allowed: true, isPremium: false, tokensUsed: 0 };
  }

  const supabase = createAdminClient();
  const today = getTodayJST();

  const { data, error } = await supabase
    .rpc("reserve_user_daily_usage", {
      p_user_id: uid,
      p_app: APP,
      p_usage_date: today,
    })
    .single();

  if (error) {
    console.error("reserve_user_daily_usage failed:", error);
    throw error;
  }

  const row = data as { allowed: boolean; is_premium: boolean; tokens_used: number } | null;
  return {
    allowed: row?.allowed ?? false,
    isPremium: row?.is_premium ?? false,
    tokensUsed: row?.tokens_used ?? 0,
  };
}

/**
 * reserveUserScan で加算した使用量を、Gemini 呼び出し失敗時に解放する。
 * 呼び出し元は成否判定 1 回につき高々 1 回だけこれを呼ぶこと (二重解放は
 * release_user_daily_usage 側で GREATEST(x-1, 0) により 0 未満にはならないが、
 * 予約した以上に解放すると実質的な無料枠拡大になる)。
 */
export async function releaseUserScan(uid: string): Promise<void> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    console.log("[DEV] Mock: releaseUserScan for", uid);
    return;
  }

  const supabase = createAdminClient();
  const today = getTodayJST();

  const { error } = await supabase.rpc("release_user_daily_usage", {
    p_user_id: uid,
    p_app: APP,
    p_usage_date: today,
  });

  if (error) {
    console.error("release_user_daily_usage failed:", error);
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
