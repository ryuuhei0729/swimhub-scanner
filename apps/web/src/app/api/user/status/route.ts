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
  const limits = PLAN_LIMITS[userDoc.plan];

  // 5. Build response
  const response: UserStatusResponse = {
    plan: userDoc.plan,
    premiumExpiresAt: userDoc.premiumExpiresAt?.toISOString() ?? null,
    todayScanCount,
    dailyLimit: limits.dailyScanLimit,
    maxSwimmers: limits.maxSwimmers,
  };

  return NextResponse.json<UserStatusResponse>(response);
}
