/**
 * Supabase認証エラーメッセージのi18n対応ユーティリティ
 */
import i18next from 'i18next'

declare const __DEV__: boolean

export const localizeAuthError = (message: string): string => {
  const t = i18next.t.bind(i18next)

  if (!message) {
    return t('auth.errors.generic')
  }

  const lowerMessage = message.toLowerCase()

  // invalid login credentials / invalid credentials
  if (lowerMessage.includes('invalid') && (lowerMessage.includes('credentials') || lowerMessage.includes('email') || lowerMessage.includes('login'))) {
    return t('auth.errors.invalidCredentials')
  }

  // email not confirmed
  if (lowerMessage.includes('email not confirmed')) {
    return t('auth.errors.emailNotConfirmed')
  }

  // user not found
  if (lowerMessage.includes('user not found')) {
    return t('auth.errors.invalidCredentials')
  }

  // user already registered
  if (lowerMessage.includes('user already registered')) {
    return t('auth.errors.alreadyRegistered')
  }

  // provider not enabled
  if (lowerMessage.includes('provider not enabled')) {
    return t('auth.errors.generic')
  }

  // oauth error
  if (lowerMessage.includes('oauth error') || lowerMessage.includes('oauth')) {
    return t('auth.errors.googleFailed')
  }

  // access_denied
  if (lowerMessage.includes('access_denied')) {
    return t('auth.errors.generic')
  }

  // invalid_grant / invalid token / token expired / invalid refresh token
  if (lowerMessage.includes('invalid_grant') || lowerMessage.includes('invalid token') || lowerMessage.includes('token expired') || lowerMessage.includes('invalid refresh token')) {
    return t('auth.errors.loginFailedRetry')
  }

  // session not found / session expired
  if (lowerMessage.includes('session not found') || lowerMessage.includes('session expired')) {
    return t('auth.errors.loginFailedRetry')
  }

  // too many requests / rate limit exceeded
  if (lowerMessage.includes('too many requests') || lowerMessage.includes('rate limit')) {
    return t('auth.errors.tooManyRequests')
  }

  // network error / timeout
  if (lowerMessage.includes('network error') || lowerMessage.includes('timeout')) {
    return t('auth.errors.network')
  }

  // cancel
  if (lowerMessage.includes('cancel') || lowerMessage.includes('キャンセル')) {
    return t('auth.errors.generic')
  }

  // 既に日本語のメッセージはそのまま返す
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(message)) {
    return message
  }

  if (__DEV__) {
    return t('auth.errors.genericDev', { message, status: '' })
  }

  return t('auth.errors.generic')
}

export const localizeSupabaseAuthError = (
  error: { message?: string; error_description?: string; error?: string } | null | undefined,
): string => {
  const t = i18next.t.bind(i18next)

  if (!error) {
    return t('auth.errors.generic')
  }
  const message = error.message || error.error_description || error.error || ''
  return localizeAuthError(message)
}
