import type { NextRequest } from "next/server";

/**
 * Extract client IP from request headers.
 * Cloudflare Workers set CF-Connecting-IP header.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
