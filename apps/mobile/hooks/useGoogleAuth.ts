/**
 * Google認証フック
 * expo-web-browserを使用してOAuthフローを実行
 */
import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { getRedirectUri, extractTokensFromUrl } from "@/lib/google-auth";
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
      const redirectUri = getRedirectUri();

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          scopes: "openid email profile",
          skipBrowserRedirect: true,
        },
      });

      if (oauthError || !data.url) {
        const errorMessage = oauthError
          ? localizeSupabaseAuthError(oauthError)
          : i18n.t("auth.errors.oauthUrlFailed");
        setError(errorMessage);
        return { success: false, error: oauthError || new Error(errorMessage) };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        preferEphemeralSession: true,
      });

      if (result.type === "success" && result.url) {
        const tokens = extractTokensFromUrl(result.url);

        if (tokens.error) {
          setError(tokens.error);
          return { success: false, error: new Error(tokens.error) };
        }

        // Supabase クライアントは flowType: "pkce" で構成されているため、
        // コールバックは通常クエリパラメータ `?code=...` で返る。
        // まずこちらを優先して exchangeCodeForSession でセッションを確立する。
        if (tokens.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            tokens.code,
          );

          if (exchangeError) {
            setError(localizeSupabaseAuthError(exchangeError));
            return { success: false, error: exchangeError };
          }

          return { success: true };
        }

        // フォールバック: implicit flow (#access_token=...) で返ってきた場合
        if (tokens.accessToken && tokens.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });

          if (sessionError) {
            setError(localizeSupabaseAuthError(sessionError));
            return { success: false, error: sessionError };
          }

          return { success: true };
        }

        setError(i18n.t("auth.errors.tokenMissing"));
        return { success: false, error: new Error(i18n.t("auth.errors.tokenMissing")) };
      }

      if (result.type === "cancel") {
        setError(i18n.t("auth.errors.cancelled"));
        return { success: false, error: new Error(i18n.t("auth.errors.cancelled")) };
      }

      if (result.type === "dismiss") {
        setError(i18n.t("auth.errors.authDismissed"));
        return { success: false, error: new Error(i18n.t("auth.errors.authDismissed")) };
      }

      setError(i18n.t("auth.errors.authFailed"));
      return { success: false, error: new Error(i18n.t("auth.errors.authFailed")) };
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : i18n.t("auth.errors.unknown");
      const localizedMessage = localizeSupabaseAuthError({ message: rawMessage });
      setError(localizedMessage);
      return { success: false, error: err instanceof Error ? err : new Error(rawMessage) };
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
