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
 * Check whether a guest IP is within the daily scan limit.
 * Does NOT increment the counter — call incrementGuestScanCount after a successful scan.
 */
export async function checkGuestRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = buildKey(ip);

  const currentStr = await kv.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= GUEST_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: GUEST_DAILY_LIMIT - current };
}

/**
 * Increment the guest scan counter for the given IP.
 * The KV entry expires after 24 hours to auto-reset.
 */
export async function incrementGuestScanCount(kv: KVNamespace, ip: string): Promise<void> {
  const key = buildKey(ip);

  const currentStr = await kv.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  await kv.put(key, String(current + 1), { expirationTtl: 86400 });
}
