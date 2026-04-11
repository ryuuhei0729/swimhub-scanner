"use client";

import { createContext, useCallback, useEffect, useRef, useMemo, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthState } from "@swimhub-scanner/shared/hooks";
import type { ScannerWebAuthContextValue, SubscriptionInfo } from "@swimhub-scanner/shared/types/auth";

export type AuthContextValue = ScannerWebAuthContextValue;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient() ?? null, []);
  const { user, loading } = useAuthState(supabase);
  const [isGuest, setIsGuest] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const wasGuestRef = useRef(false);

  // サブスクリプション情報を取得
  const fetchSubscription = useCallback(
    async (userId: string): Promise<SubscriptionInfo | null> => {
      if (!supabase) return null;
      try {
        const { data, error } = (await supabase
          .from("user_subscriptions")
          .select("plan, status, cancel_at_period_end, premium_expires_at, trial_end")
          .eq("id", userId)
          .single()) as {
          data: {
            plan: string;
            status: string | null;
            cancel_at_period_end: boolean | null;
            premium_expires_at: string | null;
            trial_end: string | null;
          } | null;
          error: unknown;
        };

        if (error || !data) {
          return {
            plan: "free",
            status: null,
            cancelAtPeriodEnd: false,
            premiumExpiresAt: null,
            trialEnd: null,
          };
        }

        return {
          plan: data.plan as "free" | "premium",
          status: data.status as SubscriptionInfo["status"],
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          premiumExpiresAt: data.premium_expires_at ?? null,
          trialEnd: data.trial_end ?? null,
        };
      } catch {
        return {
          plan: "free",
          status: null,
          cancelAtPeriodEnd: false,
          premiumExpiresAt: null,
          trialEnd: null,
        };
      }
    },
    [supabase],
  );

  // サブスクリプション情報を再取得（外部から呼び出し可能）
  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    const sub = await fetchSubscription(user.id);
    setSubscription(sub);
  }, [user, fetchSubscription]);

  // ユーザーが変わったらサブスクリプション情報を取得 & ゲストモード解除
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;

    if (userId) {
      // ゲストからログインした場合、ゲストモードを解除
      if (wasGuestRef.current) {
        wasGuestRef.current = false;
        // コールバック経由で setState を呼ぶことで同期的な setState を回避
        Promise.resolve().then(() => setIsGuest(false));
      }
      fetchSubscription(userId).then(setSubscription);
    } else {
      // ユーザーがログアウトした場合はコールバック経由でリセット
      Promise.resolve(null).then(setSubscription);
    }
  }, [user, fetchSubscription]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithApple = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()!;
    // scope: 'local' でサーバーへのリクエストをスキップし、ローカルセッションのみ破棄
    // サーバー不到達時の ERR_CONNECTION_REFUSED を防止
    await supabase.auth.signOut({ scope: "local" });
    setIsGuest(false);
  }, []);

  const enterGuestMode = useCallback(() => {
    wasGuestRef.current = true;
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isGuest,
        subscription,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        enterGuestMode,
        exitGuestMode,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
