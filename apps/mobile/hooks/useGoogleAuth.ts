/**
 * Google認証フック
 * expo-web-browserを使用してOAuthフローを実行
 */
import { useState, useCallback } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { getRedirectUri, extractTokensFromUrl } from '@/lib/google-auth'
import { supabase } from '@/lib/supabase'
import { localizeSupabaseAuthError } from '@/utils/authErrorLocalizer'

WebBrowser.maybeCompleteAuthSession()

export interface GoogleAuthResult {
  success: boolean
  error?: Error | null
}

export interface UseGoogleAuthReturn {
  signInWithGoogle: () => Promise<GoogleAuthResult>
  loading: boolean
  error: string | null
  clearError: () => void
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    if (!supabase) {
      setError('Supabaseクライアントが初期化されていません')
      return { success: false, error: new Error('Supabaseクライアントが初期化されていません') }
    }

    setLoading(true)
    setError(null)

    try {
      const redirectUri = getRedirectUri()

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          scopes: 'openid email profile',
          skipBrowserRedirect: true,
        },
      })

      if (oauthError || !data.url) {
        const errorMessage = oauthError ? localizeSupabaseAuthError(oauthError) : 'OAuth URLの生成に失敗しました'
        setError(errorMessage)
        return { success: false, error: oauthError || new Error('OAuth URLの生成に失敗しました') }
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)

      if (result.type === 'success' && result.url) {
        const tokens = extractTokensFromUrl(result.url)

        if (tokens.error) {
          setError(tokens.error)
          return { success: false, error: new Error(tokens.error) }
        }

        if (tokens.accessToken && tokens.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          })

          if (sessionError) {
            setError(localizeSupabaseAuthError(sessionError))
            return { success: false, error: sessionError }
          }

          return { success: true }
        }

        setError('認証トークンが取得できませんでした')
        return { success: false, error: new Error('認証トークンが取得できませんでした') }
      }

      if (result.type === 'cancel') {
        setError('認証がキャンセルされました')
        return { success: false, error: new Error('認証がキャンセルされました') }
      }

      if (result.type === 'dismiss') {
        setError('認証が中断されました')
        return { success: false, error: new Error('認証が中断されました') }
      }

      setError('認証に失敗しました')
      return { success: false, error: new Error('認証に失敗しました') }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '不明なエラーが発生しました'
      const localizedMessage = localizeSupabaseAuthError({ message: rawMessage })
      setError(localizedMessage)
      return { success: false, error: err instanceof Error ? err : new Error(rawMessage) }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    signInWithGoogle,
    loading,
    error,
    clearError,
  }
}
