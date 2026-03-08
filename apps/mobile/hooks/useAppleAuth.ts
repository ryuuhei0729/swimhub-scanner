/**
 * Apple認証フック
 * expo-apple-authenticationを使用してネイティブのApple認証を実行
 */
import { useState, useCallback } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { localizeSupabaseAuthError } from '@/utils/authErrorLocalizer'

export interface AppleAuthResult {
  success: boolean
  error?: Error | null
}

type AppleAuthErrorCode =
  | 'ERR_REQUEST_CANCELED'
  | 'ERR_REQUEST_FAILED'
  | 'ERR_REQUEST_INVALID'
  | 'ERR_REQUEST_NOT_HANDLED'
  | 'ERR_REQUEST_UNKNOWN'

type AppleAuthError = Error & { code?: AppleAuthErrorCode }

export interface UseAppleAuthReturn {
  signInWithApple: () => Promise<AppleAuthResult>
  loading: boolean
  error: string | null
  clearError: () => void
  isAvailable: boolean
}

export const useAppleAuth = (): UseAppleAuthReturn => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAvailable = Platform.OS === 'ios'

  const signInWithApple = useCallback(async (): Promise<AppleAuthResult> => {
    if (!isAvailable) {
      setError('Apple認証はiOSでのみ利用可能です')
      return { success: false, error: new Error('Apple認証はiOSでのみ利用可能です') }
    }

    if (!supabase) {
      setError('Supabaseクライアントが初期化されていません')
      return { success: false, error: new Error('Supabaseクライアントが初期化されていません') }
    }

    setLoading(true)
    setError(null)

    const APPLE_AUTH_TIMEOUT_MS = 60000
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('認証がタイムアウトしました。もう一度お試しください。')
    }, APPLE_AUTH_TIMEOUT_MS)

    try {
      const isAppleAuthAvailable = await AppleAuthentication.isAvailableAsync()
      if (!isAppleAuthAvailable) {
        setError('このデバイスではApple認証を利用できません')
        return { success: false, error: new Error('このデバイスではApple認証を利用できません') }
      }

      // nonce生成（リプレイ攻撃防止）
      const rawNonce = Crypto.getRandomValues(new Uint8Array(32))
        .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      )

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })

      if (!credential.identityToken) {
        setError('Apple認証トークンが取得できませんでした')
        return { success: false, error: new Error('Apple認証トークンが取得できませんでした') }
      }

      const fullName = credential.fullName
      const displayName = fullName
        ? [fullName.familyName, fullName.givenName].filter(Boolean).join(' ')
        : undefined

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      })

      if (signInError) {
        setError(localizeSupabaseAuthError(signInError))
        return { success: false, error: signInError }
      }

      if (displayName) {
        await supabase.auth.updateUser({
          data: { name: displayName },
        })
      }

      return { success: true }
    } catch (e) {
      const err = e as AppleAuthError

      if (
        err.code === 'ERR_REQUEST_CANCELED' ||
        (err.code === 'ERR_REQUEST_UNKNOWN' && err.message?.toLowerCase().includes('authorization attempt failed'))
      ) {
        setError('認証がキャンセルされました')
        return { success: false, error: new Error('認証がキャンセルされました') }
      }

      if (err.code === 'ERR_REQUEST_NOT_HANDLED' || err.code === 'ERR_REQUEST_FAILED') {
        setError('Apple認証に失敗しました。Googleでのログインもお試しください。')
        return { success: false, error: err }
      }

      const rawMessage = err.message || '不明なエラーが発生しました'
      const localizedMessage = localizeSupabaseAuthError({ message: rawMessage })
      setError(localizedMessage)
      return { success: false, error: err }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [isAvailable])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    signInWithApple,
    loading,
    error,
    clearError,
    isAvailable,
  }
}
