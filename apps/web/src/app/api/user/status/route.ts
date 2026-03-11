import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, ensureUserDocument } from "@/lib/api-helpers";
import { getTodayScanCount } from "@/lib/supabase/usage";
import { PLAN_LIMITS } from "@swimhub-scanner/shared";
import type { UserStatusResponse } from "@swimhub-scanner/shared";

export async function GET(request: NextRequest) {
  // 1. Auth check
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const { auth: { uid }, supabase } = authResult.result;

  // 2. Get user data
  const userDoc = await ensureUserDocument(supabase, uid);

  // 3. Get today's scan count
  const todayScanCount = await getTodayScanCount(supabase, uid);

  // 4. Get plan limits
  const plan = userDoc.plan;
  const limits = PLAN_LIMITS[plan];

  // 5. Compute canScan and remainingScans
  const dailyLimit = limits.dailyScanLimit;
  const canScan = dailyLimit === null || todayScanCount < dailyLimit;
  const remainingScans = dailyLimit === null ? null : Math.max(0, dailyLimit - todayScanCount);

  // 6. Build response
  const response: UserStatusResponse = {
    plan,
    premiumExpiresAt: userDoc.premiumExpiresAt?.toISOString() ?? null,
    todayScanCount,
    dailyLimit,
    maxSwimmers: limits.maxSwimmers,
    canScan,
    remainingScans,
  };

  return NextResponse.json<UserStatusResponse>(response);
}
