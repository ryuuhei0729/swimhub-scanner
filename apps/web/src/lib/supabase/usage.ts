import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayJST } from "@swimhub-scanner/shared/utils";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types";
import type { PlanType } from "@swimhub-scanner/shared";

const APP = "swimhub_scanner" as const;

/**
 * Get today's scan count for a user.
 */
export async function getTodayScanCount(
  supabase: SupabaseClient,
  uid: string,
): Promise<number> {
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
 * Check if a user can scan (has not exceeded daily limit).
 */
export async function canUserScan(
  supabase: SupabaseClient,
  uid: string,
  plan: PlanType,
): Promise<boolean> {
  const limits = PLAN_LIMITS[plan];
  if (limits.dailyScanLimit === null) {
    return true;
  }

  const count = await getTodayScanCount(supabase, uid);
  return count < limits.dailyScanLimit;
}

/**
 * Increment the scan count for today.
 */
export async function incrementScanCount(
  supabase: SupabaseClient,
  uid: string,
): Promise<void> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    console.log("[DEV] Mock: incrementScanCount for", uid);
    return;
  }

  const today = getTodayJST();

  // UPSERT: insert or update usage count
  const { data: existing } = await supabase
    .from("app_daily_usage")
    .select("id, usage_count")
    .eq("user_id", uid)
    .eq("app", APP)
    .eq("usage_date", today)
    .single();

  if (existing) {
    await supabase
      .from("app_daily_usage")
      .update({
        usage_count: existing.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("app_daily_usage").insert({
      user_id: uid,
      app: APP,
      usage_date: today,
      usage_count: 1,
      last_used_at: new Date().toISOString(),
    });
  }
}
