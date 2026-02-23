import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiErrorResponse, UserDocument } from "@swimhub-scanner/shared";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export interface AuthenticatedRequest {
  uid: string;
  email: string | undefined;
}

export interface VerifyAuthResult {
  auth: AuthenticatedRequest;
  supabase: SupabaseClient;
  setCookiesOnResponse: (response: NextResponse) => void;
}

/**
 * Verify the Supabase session from cookies.
 */
export async function verifyAuth(
  request: NextRequest,
): Promise<{ result: VerifyAuthResult } | { error: NextResponse<ApiErrorResponse> }> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    const { client, setCookiesOnResponse } = createRouteHandlerClient(request);
    return {
      result: {
        auth: { uid: "dev-user-001", email: "dev@example.com" },
        supabase: client,
        setCookiesOnResponse,
      },
    };
  }

  const { client: supabase, setCookiesOnResponse } = createRouteHandlerClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: "認証が必要です", code: "UNAUTHORIZED" as const },
        { status: 401 },
      ),
    };
  }

  return {
    result: {
      auth: { uid: user.id, email: user.email },
      supabase,
      setCookiesOnResponse,
    },
  };
}

/**
 * Ensure a user_subscriptions row exists for the user.
 * Creates a new row with default "free" plan on first use.
 */
export async function ensureUserDocument(
  supabase: SupabaseClient,
  uid: string,
): Promise<UserDocument> {
  // Mock mode
  if (process.env.SUPABASE_MOCK_MODE === "true") {
    return {
      plan: "free",
      premiumExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("id", uid)
    .single();

  if (existing) {
    return {
      plan: existing.plan as "free" | "premium",
      premiumExpiresAt: existing.premium_expires_at ? new Date(existing.premium_expires_at) : null,
      createdAt: new Date(existing.created_at),
      updatedAt: new Date(existing.updated_at),
    };
  }

  // Create new user row
  const { data: newRow } = await supabase
    .from("user_subscriptions")
    .insert({ id: uid })
    .select()
    .single();

  if (newRow) {
    return {
      plan: newRow.plan as "free" | "premium",
      premiumExpiresAt: null,
      createdAt: new Date(newRow.created_at),
      updatedAt: new Date(newRow.updated_at),
    };
  }

  // Fallback
  return {
    plan: "free",
    premiumExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
