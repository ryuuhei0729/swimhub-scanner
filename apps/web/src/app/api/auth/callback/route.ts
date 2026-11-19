import { handleAuthCallback } from "@ryuuhei0729/swimhub-oauth/web";
import type { NextRequest } from "next/server";
import {
  buildLastLoginMethodCookie,
  isLoginMethod,
  LOGIN_METHOD_QUERY_PARAM,
} from "@/lib/lastLoginMethod";

/**
 * OAuth (PKCE の code) / メール確認 (token_hash + type) の両コールバックを
 * 共有パッケージ (@ryuuhei0729/swimhub-oauth/web) の handleAuthCallback に委譲する。
 * 実装本体・挙動の詳細は同パッケージの JSDoc を参照。
 *
 * scanner にも `apps/web/src/app/[locale]` によるルーティングと `packages/i18n` の
 * 5言語対応が存在するが、ログイン遷移先は `/ja/login` 固定、成功時のデフォルト遷移先も
 * `/` 固定にしている。これはロケール機構が無いからではなく、移行前の route.ts (git 履歴上、
 * 常に `/ja/login` をハードコードしていた) の挙動を1:1で維持するため。ロケールに追従させる
 * 変更は、この移行とは別に意図的な挙動変更として扱うべき。
 * getDefaultRedirectForOtpType は defaultRedirectPath と同じ `/` を返す (両者を一致させないと
 * redirect_to 未指定時のフォールバック先が経路によって食い違ってしまう)。
 *
 * OAuth 開始時に redirectTo へ載せた login_method は、セッションが確立した (= ログイン成功)
 * ときだけ「直近で利用」ラベル用の Cookie に記録する。
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawLoginMethod = requestUrl.searchParams.get(LOGIN_METHOD_QUERY_PARAM);
  const loginMethod = isLoginMethod(rawLoginMethod) ? rawLoginMethod : null;
  let loginSucceeded = false;

  const response = await handleAuthCallback({
    request,
    defaultRedirectPath: "/",
    loginPath: "/ja/login",
    getDefaultRedirectForOtpType: () => "/",
    onSessionEstablished: (_session, { flow }) => {
      if (flow === "code") {
        loginSucceeded = true;
      }
    },
  });

  if (loginSucceeded && loginMethod) {
    response.headers.append(
      "Set-Cookie",
      buildLastLoginMethodCookie(loginMethod, requestUrl.protocol === "https:"),
    );
  }

  return response;
}
