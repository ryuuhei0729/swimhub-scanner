import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const signIn = React.useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabaseクライアントが初期化されていません') }
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error }
      }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const signUp = React.useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabaseクライアントが初期化されていません') }
    }
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        return { error }
      }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const signOut = React.useCallback(async () => {
    if (!supabase) {
      return { error: new Error('Supabaseクライアントが初期化されていません') }
    }
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { error }
      }

      // Zustand ストアをリセット
      try {
        const { useScanResultStore } = await import('@/stores/scanResultStore')
        useScanResultStore.getState().reset()
      } catch {
        // ストアがまだ読み込まれていない場合は無視
      }

      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as Error }
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!supabase) {
      console.error('Supabaseクライアントが初期化されていません')
      setLoading(false)
      return
    }

    // タイムアウト設定（10秒後にloadingをfalseにする）
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading((prev) => {
          if (prev) {
            console.warn('認証状態の確認がタイムアウトしました')
            return false
          }
          return prev
        })
      }
    }, 10000)

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return
        clearTimeout(timeoutId)
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(false)
      },
    )

    // 初期セッションを明示的に取得（フォールバック）
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        clearTimeout(timeoutId)
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        setLoading(false)
      }
    }).catch((error) => {
      console.error('初期セッション取得エラー:', error)
      if (isMounted) {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
