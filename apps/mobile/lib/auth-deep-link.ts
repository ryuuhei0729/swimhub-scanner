/**
 * 認証系 deep link (メール確認・パスワードリセット等) の URL を扱うユーティリティ
 */
import * as Linking from "expo-linking";

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Supabase メールテンプレートの `token_hash` 形式で使われる検証タイプ。
 * `invite` は本アプリのフローで使わないため対象外とする。
 */
export type EmailOtpLinkType = "signup" | "recovery" | "email_change" | "email" | "magiclink";

const EMAIL_OTP_LINK_TYPES: readonly EmailOtpLinkType[] = [
  "signup",
  "recovery",
  "email_change",
  "email",
  "magiclink",
];

export function isEmailOtpLinkType(value: unknown): value is EmailOtpLinkType {
  return typeof value === "string" && (EMAIL_OTP_LINK_TYPES as readonly string[]).includes(value);
}

/**
 * deep link の URL から Supabase メールテンプレートの `token_hash`/`type` クエリを抽出する。
 * 抽出できない、または `type` が想定外の値の場合は `null` を返す。
 */
export function extractTokenHash(url: string): { tokenHash: string; type: EmailOtpLinkType } | null {
  try {
    const { queryParams } = Linking.parse(url);
    const tokenHash = firstString(queryParams?.token_hash);
    const type = firstString(queryParams?.type);
    if (!tokenHash || !isEmailOtpLinkType(type)) return null;
    return { tokenHash, type };
  } catch {
    return null;
  }
}

/**
 * deep link の URL に含まれるエラー情報 (error_description を優先) を抽出する。
 * PKCE のエラーリダイレクト (query) と implicit flow (hash) のどちらの形式で
 * 返ってきても検出できるよう両方確認する。
 */
export function extractDeepLinkError(url: string): string | null {
  try {
    const { queryParams } = Linking.parse(url);
    const queryError =
      firstString(queryParams?.error_description) ||
      firstString(queryParams?.error_code) ||
      firstString(queryParams?.error);
    if (queryError) return queryError;
  } catch {
    // query 側の parse に失敗した場合は hash 側の確認にフォールバックする
  }

  try {
    const urlObj = new URL(url);
    const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ""));
    const hashError =
      hashParams.get("error_description") || hashParams.get("error_code") || hashParams.get("error");
    if (hashError) return hashError;
  } catch {
    // どちらの形式でもエラー情報が見つからなかった
  }

  return null;
}
