import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ブラウザ環境でSupabaseクライアントを管理（Hot Reload対応）
declare global {
  interface Window {
    __supabase_scanner_client__?: SupabaseClient;
  }
}

function isLocalEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

// ブラウザ環境でのみSupabaseクライアントを作成（シングルトン）
export const supabase: SupabaseClient | undefined =
  typeof window !== "undefined"
    ? (window.__supabase_scanner_client__ ??= createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: {
            sameSite: "lax",
            secure: !isLocalEnvironment(),
            path: "/",
          },
        },
      ))
    : undefined;

export function getSupabaseBrowserClient(): SupabaseClient | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  if (!supabase) {
    throw new Error("Supabaseクライアントが初期化されていません");
  }
  return supabase;
}
