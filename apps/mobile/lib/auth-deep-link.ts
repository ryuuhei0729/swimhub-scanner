/**
 * 認証系 deep link (メール確認・パスワードリセット等) の URL を扱うユーティリティ
 */
import * as Linking from "expo-linking";

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
