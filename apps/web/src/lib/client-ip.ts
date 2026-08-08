import type { NextRequest } from "next/server";

/**
 * Extract client IP from request headers.
 * Cloudflare Workers set CF-Connecting-IP header.
 *
 * Note: `Headers.get()` returns `""` (not `null`) when a header is present but
 * empty, so `??` alone does not fall through in that case. Use truthy checks
 * instead so a spoofed empty `CF-Connecting-IP` header falls through to
 * `X-Forwarded-For` (and an empty/whitespace-only `X-Forwarded-For` falls
 * through to "unknown") rather than being taken as the final value.
 *
 * `.trim()` on `CF-Connecting-IP` mirrors the existing `X-Forwarded-For`
 * handling for consistency (Cloudflare shouldn't send padded values, but this
 * keeps both header reads symmetric and immune to incidental whitespace).
 *
 * "unknown" bucket note: when no IP can be determined at all, every such
 * guest request shares a single "unknown" rate-limit bucket
 * (reserveGuestScan hashes this literal string). This is fail-closed, not an
 * abuse vector: it only means unrelated IP-less guests compete for the same
 * 1/day slot, never a way to bypass the limit. Left as-is intentionally
 * (scope: fix the `??` fallthrough bug only). Moving this to `null` (so the
 * caller can decide to skip rate limiting instead of sharing a bucket) is a
 * separate, deliberately deferred change.
 */
export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFor = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  return "unknown";
}
