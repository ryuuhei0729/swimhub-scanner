import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(requestUrl.origin + "/login?error=missing_code");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(requestUrl.origin + "/login?error=config_error");
  }

  try {
    const cookieStore = await cookies();

    // Cookie 操作を記録する配列
    type CookieToSet = {
      name: string;
      value: string;
      options?: Record<string, unknown>;
    };
    const cookiesToSet: CookieToSet[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          // cookieStore を優先（PKCE code verifier 用）
          const storeCookies = cookieStore.getAll();
          const requestCookies = request.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value || "",
          }));

          const cookieMap = new Map(storeCookies.map((c) => [c.name, c.value]));
          requestCookies.forEach((c) => {
            if (!cookieMap.has(c.name)) {
              cookieMap.set(c.name, c.value);
            }
          });

          return Array.from(cookieMap.entries()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies: CookieToSet[]) {
          cookiesToSet.push(...cookies);
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      const errorResponse = NextResponse.redirect(
        requestUrl.origin + "/login?error=auth_failed",
      );
      applyCookies(errorResponse, cookiesToSet);
      return errorResponse;
    }

    const successResponse = NextResponse.redirect(requestUrl.origin + "/");
    applyCookies(successResponse, cookiesToSet);
    return successResponse;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(requestUrl.origin + "/login?error=auth_failed");
  }
}

function applyCookies(
  response: NextResponse,
  cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
) {
  cookiesToSet.forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      ...(cookie.options as Record<string, string | boolean | number | Date>),
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  });
}
