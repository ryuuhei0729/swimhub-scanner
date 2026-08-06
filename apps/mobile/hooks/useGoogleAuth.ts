/**
 * Google認証フック
 * expo-web-browserを使用してOAuthフローを実行
 */
import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { signInWithGoogle as sharedSignInWithGoogle, APP_SCHEME } from "@/lib/google-auth";
import { supabase } from "@/lib/supabase";
import { localizeSupabaseAuthError } from "@/utils/authErrorLocalizer";
import i18n from "@/lib/i18n";

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  success: boolean;
  error?: Error | null;
}

export interface UseGoogleAuthReturn {
  signInWithGoogle: () => Promise<GoogleAuthResult>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * 共有パッケージ (@ryuuhei0729/swimhub-oauth) はローカライズ済み文字列を返さず、
 * 機械可読な固定コードを Error.message に入れて返す。まずこの表で完全一致を
 * 試み (移行前と同じ文言を出すため、8コードそれぞれを移行前の分岐が使っていた
 * キーに対応させている)、一致しない場合 (Supabase の生エラーメッセージ等、
 * utils/authErrorLocalizer.ts の部分一致ロジックの対象) のみフォールバックする。
 *
 * - url_not_received  … 旧: signInWithOAuth 成功時に data.url が無い場合の
 *                        "auth.errors.oauthUrlFailed"
 * - auth_cancelled    … 旧: result.type === "cancel" の "auth.errors.cancelled"
 * - auth_dismissed    … 旧: result.type === "dismiss" の "auth.errors.authDismissed"
 *                        (auth_dismissed は authErrorLocalizer の部分一致に
 *                        ヒットしないため、ここに無いと文言が変わってしまう)
 * - auth_failed       … 旧: 上記いずれでもない result.type の "auth.errors.authFailed"
 * - invalid_url       … 旧: extractTokensFromUrl の URL parse 失敗時の
 *                        "auth.errors.urlParseFailed"
 * - code_exchange_failed … claimOAuthCode で負けた側が、勝った側の交換失敗を
 *                        検知した場合 (移行前は dedup 自体が無く該当なし)。
 *                        汎用の "auth.errors.oauthError" を割り当てる
 * - session_not_received … exchangeCodeForSession/setSession がエラー無しで
 *                        session を返さなかった場合 (移行前は session 有無を
 *                        見ておらず該当なし)。"auth.errors.sessionNotFound" を割り当てる
 * - tokens_not_received  … 旧: code も access/refresh token も無かった場合の
 *                        "auth.errors.tokenMissing"
 */
const ERROR_CODE_I18N_KEY: Readonly<Record<string, string>> = {
  url_not_received: "auth.errors.oauthUrlFailed",
  auth_cancelled: "auth.errors.cancelled",
  auth_dismissed: "auth.errors.authDismissed",
  auth_failed: "auth.errors.authFailed",
  invalid_url: "auth.errors.urlParseFailed",
  code_exchange_failed: "auth.errors.oauthError",
  session_not_received: "auth.errors.sessionNotFound",
  tokens_not_received: "auth.errors.tokenMissing",
};

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    if (!supabase) {
      const message = i18n.t("auth.errors.supabaseNotConfigured");
      setError(message);
      return { success: false, error: new Error(message) };
    }

    setLoading(true);
    setError(null);

    try {
      // loading 状態管理と i18n ローカライズ以外のロジック (PKCE 交換・
      // claimOAuthCode による二重処理ガード・implicit フォールバック等) は
      // 全て共有パッケージ側の責務。signInWithGoogle は内部で例外を投げず、
      // 常に {success, error?} で解決する契約になっている。
      const result = await sharedSignInWithGoogle({
        supabase,
        scheme: APP_SCHEME,
        // preferEphemeralSession を落とすと Cookie 分離の挙動が変わるため、
        // 移行前と同じ値を browserOptions として引き継ぐ。
        browserOptions: { preferEphemeralSession: true },
      });

      if (!result.success) {
        const code = result.error?.message ?? "";
        const i18nKey = ERROR_CODE_I18N_KEY[code];
        const localizedMessage = i18nKey
          ? i18n.t(i18nKey, { defaultValue: i18nKey })
          : localizeSupabaseAuthError({ message: code });
        setError(localizedMessage);
        return { success: false, error: result.error ?? new Error(localizedMessage) };
      }

      return { success: true };
    } catch (unexpectedException) {
      // 保険: signInWithGoogle は「内部で例外を投げず常に {success, error?} で
      // 解決する」契約 (上のコメント参照) だが、将来のマイナーバージョン更新で
      // この契約が破られた場合の唯一の防御層として薄い try/catch を残す。
      const rawMessage =
        unexpectedException instanceof Error ? unexpectedException.message : i18n.t("auth.errors.unknown");
      const localizedMessage = localizeSupabaseAuthError({ message: rawMessage });
      setError(localizedMessage);
      return {
        success: false,
        error: unexpectedException instanceof Error ? unexpectedException : new Error(rawMessage),
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithGoogle,
    loading,
    error,
    clearError,
  };
};
