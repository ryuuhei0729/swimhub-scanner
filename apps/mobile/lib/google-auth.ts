/**
 * Google OAuth認証ユーティリティ
 * Expo + Supabase でのGoogle認証フローを管理
 */
import { makeRedirectUri } from "expo-auth-session";
import i18n from "@/lib/i18n";

/**
 * リダイレクトURIを生成
 * カスタムスキーム(swimhub-scanner://)を使用
 */
export const getRedirectUri = (): string => {
  return makeRedirectUri({
    scheme: "swimhub-scanner",
    path: "auth/callback",
    native: "swimhub-scanner://auth/callback",
  });
};

/**
 * コールバックURLからトークン (または PKCE の認可コード) を抽出する。
 *
 * Supabase の flowType 設定によってコールバックの返り方が変わる:
 * - "pkce" (現在の設定): クエリパラメータ `?code=...` で認可コードが返る
 * - "implicit": フラグメント `#access_token=...` でトークンが直接返る
 *
 * 両方の形式を確認し、呼び出し側 (useGoogleAuth) で code を優先して
 * exchangeCodeForSession を試み、無ければ implicit のトークンにフォールバックする。
 */
export interface ExtractedTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
  /** PKCE フロー時にクエリパラメータで返る認可コード */
  code: string | null;
  error: string | null;
}

export const extractTokensFromUrl = (url: string): ExtractedTokens => {
  try {
    const urlObj = new URL(url);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    const queryParams = urlObj.searchParams;

    // OAuth プロバイダ / Supabase 側のエラーは PKCE (query) と implicit (hash) の
    // どちらの形式で返ってくる可能性もあるため両方確認する
    const error =
      hashParams.get("error_description") ||
      hashParams.get("error") ||
      queryParams.get("error_description") ||
      queryParams.get("error");
    if (error) {
      return {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        tokenType: null,
        code: null,
        error,
      };
    }

    return {
      accessToken: hashParams.get("access_token"),
      refreshToken: hashParams.get("refresh_token"),
      expiresIn: hashParams.get("expires_in") ? parseInt(hashParams.get("expires_in")!, 10) : null,
      tokenType: hashParams.get("token_type"),
      code: queryParams.get("code"),
      error: null,
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      tokenType: null,
      code: null,
      error: i18n.t("auth.errors.urlParseFailed"),
    };
  }
};
