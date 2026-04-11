import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
  };
};

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません",
    );
  }
  return { url, anonKey };
}

/**
 * Server Component 用クライアント
 */
export async function createServerComponentClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component では Cookie 設定不可の場合がある
        }
      },
    },
  });
}

/**
 * API Route 用クライアント（Cookie 操作を記録し、NextResponse に適用）
 */
export function createRouteHandlerClient(request: NextRequest): {
  client: SupabaseClient;
  setCookiesOnResponse: (response: NextResponse) => void;
} {
  const cookiesToSet: CookieToSet[] = [];
  const { url, anonKey } = getEnv();

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value || "",
        }));
      },
      setAll(cookies: CookieToSet[]) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const setCookiesOnResponse = (response: NextResponse) => {
    cookiesToSet.forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, {
        ...cookie.options,
        sameSite: (cookie.options?.sameSite as "lax" | "strict" | "none") || "lax",
        secure: cookie.options?.secure ?? process.env.NODE_ENV === "production",
        path: cookie.options?.path || "/",
      });
    });
  };

  return { client, setCookiesOnResponse };
}

/**
 * 管理者用クライアント（RLS バイパス、Webhook 用）
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
