import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getTodayJST } from "@swimhub-scanner/shared/utils";

/**
 * IP アドレスを SHA-256 でハッシュ化する。
 * 生 IP を DB に保存しないためのプライバシー配慮。Cloudflare Workers ランタイム
 * の Web Crypto (crypto.subtle) を使用するため Node.js の `crypto` モジュールは
 * 使わない。
 */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * ゲストの日次スキャン枠を原子的に予約する。
 *
 * 原子性の実体は Postgres 側 (reserve_guest_scan RPC, service_role 限定) に
 * ある。単一の `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit` 文が
 * 行ロックを取りながら判定と加算を同時に行うため、並行リクエストの一方は
 * もう一方の更新完了を待ってから自分の判定を行う。以前の Cloudflare KV 版
 * (get→put の2往復・結果整合) ではこの保証が無く、並行リクエストが全て
 * `current=0` を読んで全て通過し得た。
 *
 * IP は呼び出し前に SHA-256 でハッシュ化してから渡す (DB には生 IP を保存しない)。
 */
export async function reserveGuestScan(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createAdminClient();
  const ipHash = await hashIp(ip);
  const usageDate = getTodayJST();

  const { data, error } = await supabase
    .rpc("reserve_guest_scan", {
      p_ip_hash: ipHash,
      p_usage_date: usageDate,
    })
    .single();

  if (error) {
    console.error("reserve_guest_scan failed:", error);
    throw error;
  }

  const row = data as { allowed: boolean; remaining: number } | null;
  return { allowed: row?.allowed ?? false, remaining: row?.remaining ?? 0 };
}

/**
 * reserveGuestScan で予約した枠を、Gemini 呼び出し失敗時に解放する。
 * 呼び出し元 (route.ts) は成否判定 1 回につき高々 1 回だけこれを呼ぶこと
 * (二重解放しても release_guest_scan 側は GREATEST(count-1, 0) で 0 未満には
 * ならないが、正しく予約した枠より多く解放すると実質的な無料枠拡大になる)。
 */
export async function rollbackGuestScanCount(ip: string): Promise<void> {
  const supabase = createAdminClient();
  const ipHash = await hashIp(ip);
  const usageDate = getTodayJST();

  const { error } = await supabase.rpc("release_guest_scan", {
    p_ip_hash: ipHash,
    p_usage_date: usageDate,
  });

  if (error) {
    console.error("release_guest_scan failed:", error);
  }
}
