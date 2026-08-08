import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

// NEXT_PUBLIC_SUPABASE_URL の origin を CSP connect-src に動的注入
// ローカル Supabase (http://127.0.0.1:54321) やセルフホストなど *.supabase.co に
// マッチしない URL でもブラウザからの fetch/WebSocket を許可する
const SUPABASE_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
})();
const SUPABASE_WS_ORIGIN = SUPABASE_ORIGIN.replace(/^http/, "ws");

// CSP nonce をリクエストごとに生成する (Edge Runtime 互換: Web Crypto API を使用)
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // JSON-LD の inline <script> はリクエストごとの nonce で許可する ('unsafe-inline' は使わない)
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self'",
    [
      "connect-src 'self'",
      SUPABASE_ORIGIN,
      SUPABASE_WS_ORIGIN,
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.stripe.com",
    ]
      .filter(Boolean)
      .join(" "),
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Next.js は「リクエストヘッダーの Content-Security-Policy」から nonce を自前で
  // 正規表現抽出し (getScriptNonceFromHeader)、RSC ストリーミングの自動生成インライン
  // スクリプト (self.__next_f.push(...)) にその nonce を使う。x-nonce だけでは JSON-LD
  // 用の値しか伝わらず、Next.js 自身が生成するスクリプトには適用されないため、
  // Content-Security-Policy 自体もリクエストヘッダーに乗せる必要がある。
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // input が Request インスタンスの場合、NextRequest は super(input, init) を呼ぶため
  // cookies / nextUrl も新しい headers から正しく再構築される。
  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });

  // updateSession() 内部の NextResponse.next({ request }) が requestWithNonce.headers を
  // そのまま x-middleware-override-headers 経由でレンダリングに引き渡す (updateSession
  // 自体は無変更)。
  const response = await updateSession(requestWithNonce);

  // セキュリティヘッダー (Issue #27)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CSP (Issue #17)
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    // すべてのルートにマッチ（静的ファイル、_next、sitemap、robots を除く）
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
