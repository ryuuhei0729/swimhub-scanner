/**
 * Supabase認証エラーメッセージの日本語化ユーティリティ
 */

declare const __DEV__: boolean;

const errorMessageMap: Record<string, string> = {
  "invalid login credentials": "メールアドレスまたはパスワードが正しくありません",
  "invalid credentials": "認証情報が正しくありません",
  "email not confirmed": "メールアドレスが確認されていません",
  "user not found": "ユーザーが見つかりません",
  "user already registered": "このメールアドレスは既に登録されています",
  "provider not enabled": "この認証プロバイダーは有効化されていません",
  "oauth error": "OAuth認証でエラーが発生しました",
  access_denied: "アクセスが拒否されました",
  invalid_grant: "認証の有効期限が切れました。再度お試しください",
  "invalid token": "認証トークンが無効です",
  "token expired": "認証トークンの有効期限が切れました",
  "invalid refresh token": "リフレッシュトークンが無効です",
  "session not found": "セッションが見つかりません。再度ログインしてください",
  "session expired": "セッションの有効期限が切れました。再度ログインしてください",
  "too many requests": "リクエスト回数が上限に達しました。しばらくお待ちください",
  "rate limit exceeded": "リクエスト制限を超えました。しばらくお待ちください",
  "network error": "ネットワークエラーが発生しました。接続を確認してください",
  timeout: "接続がタイムアウトしました。再度お試しください",
};

export const localizeAuthError = (message: string): string => {
  if (!message) {
    return "認証エラーが発生しました。再度お試しください";
  }

  const lowerMessage = message.toLowerCase();

  for (const [key, value] of Object.entries(errorMessageMap)) {
    if (lowerMessage === key || lowerMessage.includes(key)) {
      return value;
    }
  }

  if (lowerMessage.includes("cancel") || lowerMessage.includes("キャンセル")) {
    return "認証がキャンセルされました";
  }

  // 既に日本語のメッセージはそのまま返す
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(message)) {
    return message;
  }

  if (__DEV__) {
    return `認証エラーが発生しました: ${message}`;
  }

  return "認証エラーが発生しました。再度お試しください";
};

export const localizeSupabaseAuthError = (
  error: { message?: string; error_description?: string; error?: string } | null | undefined,
): string => {
  if (!error) {
    return "認証エラーが発生しました。再度お試しください";
  }
  const message = error.message || error.error_description || error.error || "";
  return localizeAuthError(message);
};
