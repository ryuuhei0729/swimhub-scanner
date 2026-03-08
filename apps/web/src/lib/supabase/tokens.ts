import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GUEST_INITIAL_TOKENS } from "@swimhub-scanner/shared";

/**
 * ユーザーのトークン残高を取得。
 * user_tokens テーブルにレコードがなければ初期トークンで作成。
 */
export async function getTokenBalance(
  supabase: SupabaseClient,
  uid: string,
): Promise<number> {
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    return GUEST_INITIAL_TOKENS;
  }

  const { data } = await supabase
    .from("user_tokens")
    .select("balance")
    .eq("user_id", uid)
    .single();

  if (data) {
    return data.balance;
  }

  // 初回: トークンレコードを作成（初期値 = GUEST_INITIAL_TOKENS）
  const { data: newRow } = await supabase
    .from("user_tokens")
    .insert({ user_id: uid, balance: GUEST_INITIAL_TOKENS })
    .select("balance")
    .single();

  return newRow?.balance ?? GUEST_INITIAL_TOKENS;
}

/**
 * トークンを1つ消費する。
 */
export async function consumeToken(
  supabase: SupabaseClient,
  uid: string,
): Promise<boolean> {
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    console.log("[DEV] Mock: consumeToken for", uid);
    return true;
  }

  const balance = await getTokenBalance(supabase, uid);
  if (balance <= 0) return false;

  const { error } = await supabase
    .from("user_tokens")
    .update({
      balance: balance - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid);

  return !error;
}

/**
 * トークンを追加する（購入時など）。
 */
export async function addTokens(
  supabase: SupabaseClient,
  uid: string,
  amount: number,
): Promise<number> {
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    console.log("[DEV] Mock: addTokens", amount, "for", uid);
    return amount;
  }

  const currentBalance = await getTokenBalance(supabase, uid);
  const newBalance = currentBalance + amount;

  await supabase
    .from("user_tokens")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid);

  return newBalance;
}
