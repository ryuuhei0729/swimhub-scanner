/**
 * Supabase認証エラーメッセージのローカライズユーティリティ
 * i18n を使用して翻訳キーに対応
 */
import i18n from "@/lib/i18n";

declare const __DEV__: boolean;

const errorKeyMap: Record<string, string> = {
  "invalid login credentials": "auth.errors.invalidCredentials",
  "invalid credentials": "auth.errors.invalidCredentials",
  "email not confirmed": "auth.errors.emailNotConfirmed",
  "user not found": "auth.errors.userNotFound",
  "user already registered": "auth.errors.alreadyRegistered",
  "provider not enabled": "auth.errors.providerNotEnabled",
  "oauth error": "auth.errors.oauthError",
  access_denied: "auth.errors.accessDenied",
  invalid_grant: "auth.errors.invalidGrant",
  "invalid token": "auth.errors.invalidToken",
  "token expired": "auth.errors.tokenExpired",
  "invalid refresh token": "auth.errors.invalidRefreshToken",
  "session not found": "auth.errors.sessionNotFound",
  "session expired": "auth.errors.sessionExpired",
  "too many requests": "auth.errors.tooManyRequests",
  "rate limit exceeded": "auth.errors.rateLimitExceeded",
  "network error": "auth.errors.networkError",
  timeout: "auth.errors.timeout",
};

export const localizeAuthError = (message: string): string => {
  if (!message) {
    return i18n.t("auth.errors.fallback");
  }

  const lowerMessage = message.toLowerCase();

  for (const [key, translationKey] of Object.entries(errorKeyMap)) {
    if (lowerMessage === key || lowerMessage.includes(key)) {
      return i18n.t(translationKey);
    }
  }

  if (lowerMessage.includes("cancel") || lowerMessage.includes("キャンセル")) {
    return i18n.t("auth.errors.cancelled");
  }

  // 既に日本語のメッセージはそのまま返す
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(message)) {
    return message;
  }

  if (__DEV__) {
    return i18n.t("auth.errors.fallbackDev", { message });
  }

  return i18n.t("auth.errors.fallback");
};

export const localizeSupabaseAuthError = (
  error: { message?: string; error_description?: string; error?: string } | null | undefined,
): string => {
  if (!error) {
    return i18n.t("auth.errors.fallback");
  }
  const message = error.message || error.error_description || error.error || "";
  return localizeAuthError(message);
};
