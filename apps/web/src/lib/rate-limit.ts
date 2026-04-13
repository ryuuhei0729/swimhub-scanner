import { getTodayJST } from "@swimhub-scanner/shared/utils";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types/plan";

const GUEST_DAILY_LIMIT = PLAN_LIMITS.guest.dailyScanLimit ?? 1;
const KEY_PREFIX = "guest_rate:";

/**
 * Build rate limit KV key from IP and JST date.
 */
function buildKey(ip: string): string {
  const today = getTodayJST();
  return `${KEY_PREFIX}${ip}:${today}`;
}

/**
 * Atomically check and reserve a guest scan slot.
 * Increments the counter immediately to prevent TOCTOU race conditions
 * where concurrent requests both read count=0 and both pass the check.
 * Call rollbackGuestScanCount if the scan subsequently fails.
 */
export async function reserveGuestScan(
  kv: KVNamespace,
  ip: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = buildKey(ip);

  const currentStr = await kv.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= GUEST_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Reserve the slot immediately to narrow the race window
  await kv.put(key, String(current + 1), { expirationTtl: 86400 });

  return { allowed: true, remaining: GUEST_DAILY_LIMIT - (current + 1) };
}

/**
 * Roll back the guest scan counter when a reserved scan fails.
 */
export async function rollbackGuestScanCount(kv: KVNamespace, ip: string): Promise<void> {
  const key = buildKey(ip);

  const currentStr = await kv.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current > 0) {
    await kv.put(key, String(current - 1), { expirationTtl: 86400 });
  }
}
