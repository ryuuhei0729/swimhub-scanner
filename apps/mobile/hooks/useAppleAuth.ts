/**
 * Apple認証フック
 * expo-apple-authenticationを使用してネイティブのApple認証を実行
 */
import { useState, useCallback, useRef } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { localizeSupabaseAuthError } from "@/utils/authErrorLocalizer";
import i18n from "@/lib/i18n";

export interface AppleAuthResult {
  success: boolean;
  error?: Error | null;
}

type AppleAuthErrorCode =
  | "ERR_REQUEST_CANCELED"
  | "ERR_REQUEST_FAILED"
  | "ERR_REQUEST_INVALID"
  | "ERR_REQUEST_NOT_HANDLED"
  | "ERR_REQUEST_UNKNOWN";

type AppleAuthError = Error & { code?: AppleAuthErrorCode };

export interface UseAppleAuthReturn {
  signInWithApple: () => Promise<AppleAuthResult>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isAvailable: boolean;
}

export const useAppleAuth = (): UseAppleAuthReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // タイムアウト後に遅れて届いた signInAsync の結果（または古い試行）を無視するための識別子
  const requestIdRef = useRef(0);

  const isAvailable = Platform.OS === "ios";

  const signInWithApple = useCallback(async (): Promise<AppleAuthResult> => {
    if (!isAvailable) {
      const message = i18n.t("auth.errors.appleIosOnly");
      setError(message);
      return { success: false, error: new Error(message) };
    }

    if (!supabase) {
      const message = i18n.t("auth.errors.supabaseNotConfigured");
      setError(message);
      return { success: false, error: new Error(message) };
    }

    const requestId = ++requestIdRef.current;
    const isCurrentRequest = () => requestIdRef.current === requestId;

    setLoading(true);
    setError(null);

    const APPLE_AUTH_TIMEOUT_MS = 60000;
    const timeoutId = setTimeout(() => {
      if (!isCurrentRequest()) return;
      // requestId を進め、この後 signInAsync が遅れて成功しても isCurrentRequest() が
      // false になるようにする。これが無いとタイムアウト後の遅延成功時に
      // isCurrentRequest() が true のままとなり、失敗表示済みの画面で無言ログインが
      // 成立してしまう（このタイムアウトが本来防ぐべき挙動）。
      requestIdRef.current++;
      setLoading(false);
      setError(i18n.t("auth.errors.appleTimeout"));
    }, APPLE_AUTH_TIMEOUT_MS);

    try {
      const isAppleAuthAvailable = await AppleAuthentication.isAvailableAsync();
      console.log(
        "[AppleAuth] isAvailableAsync:",
        isAppleAuthAvailable,
        "Platform:",
        Platform.OS,
        "isPad:",
        (Platform as unknown as { isPad?: boolean }).isPad,
      );
      if (!isAppleAuthAvailable) {
        const message = i18n.t("auth.errors.appleUnavailableOnDevice");
        setError(message);
        return { success: false, error: new Error(message) };
      }

      // nonce生成（リプレイ攻撃防止）
      let rawNonce: string;
      let hashedNonce: string;
      try {
        rawNonce = Crypto.getRandomValues(new Uint8Array(32)).reduce(
          (acc, val) => acc + val.toString(16).padStart(2, "0"),
          "",
        );
        hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      } catch (cryptoError) {
        console.error("[AppleAuth] Nonce generation failed:", cryptoError);
        setError(i18n.t("auth.errors.appleNonceFailed"));
        return { success: false, error: new Error("Nonce generation failed") };
      }

      console.log("[AppleAuth] Nonce generated, calling signInAsync...");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      console.log(
        "[AppleAuth] signInAsync returned. identityToken:",
        credential.identityToken ? "present" : "null",
        "user:",
        credential.user ? "present" : "null",
      );

      // タイムアウト表示後（または新しい試行が始まった後）に遅れて届いた結果は無視する。
      // ここで処理を続けると、既に失敗表示済みの画面に無言でログイン成功させてしまい、
      // ユーザーに誤解を与える（またはネイティブダイアログの二重起動と競合する）。
      if (!isCurrentRequest()) {
        console.warn("[AppleAuth] Ignoring stale signInAsync result (already timed out)");
        return { success: false, error: new Error(i18n.t("auth.errors.appleTimeout")) };
      }

      if (!credential.identityToken) {
        console.error(
          "[AppleAuth] identityToken is null. credential keys:",
          Object.keys(credential),
        );
        setError(i18n.t("auth.errors.appleTokenMissing"));
        return { success: false, error: new Error(i18n.t("auth.errors.appleTokenMissing")) };
      }

      const fullName = credential.fullName;
      const displayName = fullName
        ? [fullName.familyName, fullName.givenName].filter(Boolean).join(" ")
        : undefined;

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (signInError) {
        console.error(
          "[AppleAuth] Supabase signInWithIdToken error:",
          JSON.stringify(signInError, null, 2),
        );
        setError(localizeSupabaseAuthError(signInError));
        return { success: false, error: signInError };
      }

      console.log("[AppleAuth] Sign in successful");
      if (displayName) {
        await supabase.auth.updateUser({
          data: { name: displayName },
        });
      }

      return { success: true };
    } catch (e) {
      const err = e as AppleAuthError;
      console.error(
        "[AppleAuth] Caught error:",
        JSON.stringify({ code: err.code, message: err.message, name: err.name }, null, 2),
      );

      // ユーザーによるキャンセル
      // iPad では ERR_REQUEST_UNKNOWN のメッセージが異なる場合があるため、
      // code だけでもキャンセル扱いとする
      if (err.code === "ERR_REQUEST_CANCELED" || err.code === "ERR_REQUEST_UNKNOWN") {
        if (isCurrentRequest()) setError(i18n.t("auth.errors.appleCancelled"));
        return { success: false, error: new Error(i18n.t("auth.errors.cancelled")) };
      }

      if (
        err.code === "ERR_REQUEST_NOT_HANDLED" ||
        err.code === "ERR_REQUEST_FAILED" ||
        err.code === "ERR_REQUEST_INVALID"
      ) {
        if (isCurrentRequest()) setError(i18n.t("auth.errors.appleRequestFailed"));
        return { success: false, error: err };
      }

      const rawMessage = err.message || i18n.t("auth.errors.unknown");
      const localizedMessage = localizeSupabaseAuthError({ message: rawMessage });
      if (isCurrentRequest()) setError(localizedMessage);
      return { success: false, error: err };
    } finally {
      clearTimeout(timeoutId);
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [isAvailable]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithApple,
    loading,
    error,
    clearError,
    isAvailable,
  };
};
