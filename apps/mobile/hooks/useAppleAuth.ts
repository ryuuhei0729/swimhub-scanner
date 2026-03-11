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
      console.log('[AppleAuth] isAvailableAsync:', isAppleAuthAvailable, 'Platform:', Platform.OS, 'isPad:', (Platform as any).isPad)
      if (!isAppleAuthAvailable) {
        setError('このデバイスではApple認証を利用できません')
        return { success: false, error: new Error('このデバイスではApple認証を利用できません') }
      }

      // nonce生成（リプレイ攻撃防止）
      let rawNonce: string
      let hashedNonce: string
      try {
        rawNonce = Crypto.getRandomValues(new Uint8Array(32))
          .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
        hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce,
        )
      } catch (cryptoError) {
        console.error('[AppleAuth] Nonce generation failed:', cryptoError)
        setError('認証の初期化に失敗しました。アプリを再起動してお試しください。')
        return { success: false, error: new Error('Nonce generation failed') }
      }

      console.log('[AppleAuth] Nonce generated, calling signInAsync...')
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })
      console.log('[AppleAuth] signInAsync returned. identityToken:', credential.identityToken ? 'present' : 'null', 'user:', credential.user ? 'present' : 'null')

      if (!credential.identityToken) {
        console.error('[AppleAuth] identityToken is null. credential keys:', Object.keys(credential))
        setError('Apple認証トークンが取得できませんでした。もう一度お試しください。')
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
        console.error('[AppleAuth] Supabase signInWithIdToken error:', JSON.stringify(signInError, null, 2))
        setError(localizeSupabaseAuthError(signInError))
        return { success: false, error: signInError }
      }

      console.log('[AppleAuth] Sign in successful')
      if (displayName) {
        await supabase.auth.updateUser({
          data: { name: displayName },
        })
      }

      return { success: true }
    } catch (e) {
      const err = e as AppleAuthError
      console.error('[AppleAuth] Caught error:', JSON.stringify({ code: err.code, message: err.message, name: err.name }, null, 2))

      // ユーザーによるキャンセル
      // iPad では ERR_REQUEST_UNKNOWN のメッセージが異なる場合があるため、
      // code だけでもキャンセル扱いとする
      if (
        err.code === 'ERR_REQUEST_CANCELED' ||
        err.code === 'ERR_REQUEST_UNKNOWN'
      ) {
        setError('認証がキャンセルされました。もう一度お試しください。')
        return { success: false, error: new Error('認証がキャンセルされました') }
      }

      if (err.code === 'ERR_REQUEST_NOT_HANDLED' || err.code === 'ERR_REQUEST_FAILED' || err.code === 'ERR_REQUEST_INVALID') {
        setError('Apple認証に失敗しました。しばらく待ってからもう一度お試しください。')
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
