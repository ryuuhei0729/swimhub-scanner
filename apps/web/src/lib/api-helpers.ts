import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ApiErrorResponse } from "@swimhub-scanner/shared/types/api";
import type { UserDocument } from "@swimhub-scanner/shared/types/firestore";
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
 * Verify Bearer token from Authorization header (mobile clients).
 */
async function verifyBearerToken(
  accessToken: string,
): Promise<{ result: VerifyAuthResult } | { error: NextResponse<ApiErrorResponse> }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: NextResponse.json(
        { error: "サーバー設定エラー", code: "API_ERROR" as const },
        { status: 500 },
      ),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

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
      setCookiesOnResponse: () => {}, // no-op for Bearer token clients
    },
  };
}

/**
 * Verify the Supabase session.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
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

  // Check for Bearer token (mobile clients)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const accessToken = authHeader.substring(7);
    return verifyBearerToken(accessToken);
  }

  // Fall back to cookie-based auth (web clients)
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
