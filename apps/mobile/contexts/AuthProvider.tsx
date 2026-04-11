import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getGuestTodayCount, clearGuestUsage } from "@/lib/guest-daily-limit";
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  addCustomerInfoListener,
} from "@/lib/revenucat";
import type { ScannerMobileAuthContextType, SubscriptionInfo } from "@swimhub-scanner/shared/types/auth";
import { useAuthState } from "@swimhub-scanner/shared/hooks";
import { env } from "@/lib/env";

const API_BASE_URL = env.webApiUrl;

/** サブスクリプション情報付きの認証コンテキスト型 */
export type AuthContextType = ScannerMobileAuthContextType & {
  subscription: SubscriptionInfo | null;
  refreshSubscription: () => Promise<void>;
  /** 認証状態の遷移中（ログイン/ログアウト直後）に true になる */
  transitioning: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ゲストのローカル利用データをサーバーに引き継ぎ、ローカルをクリアする
 */
async function migrateGuestTokens(accessToken: string): Promise<void> {
  try {
    const todayCount = await getGuestTodayCount();
    await fetch(`${API_BASE_URL}/api/user/migrate-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ guestTodayCount: todayCount }),
    });
    await clearGuestUsage();
  } catch (err) {
    console.error("ゲスト利用データの引き継ぎに失敗:", err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuthState(supabase);
  const [isGuest, setIsGuest] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const wasGuestRef = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const prevUserRef = useRef<typeof user>(undefined);

  // 認証状態の遷移を検知してローディング画面を表示する
  // （初回ロード完了後、user の有無が変わった場合にのみ発火）
  useEffect(() => {
    if (loading) return;

    const prevUser = prevUserRef.current;
    if (prevUser === undefined) {
      // 初回ロード完了時は遷移とみなさない
      prevUserRef.current = user;
      return;
    }

    const wasLoggedIn = !!prevUser;
    const isLoggedIn = !!user;

    if (wasLoggedIn !== isLoggedIn) {
      setTransitioning(true);
    }

    prevUserRef.current = user;
  }, [user, loading]);

  // transitioning を一定時間後に自動リセット
  useEffect(() => {
    if (!transitioning) return;
    const timer = setTimeout(() => setTransitioning(false), 400);
    return () => clearTimeout(timer);
  }, [transitioning]);

  // RevenueCat SDK の初期化
  useEffect(() => {
    initRevenueCat();
  }, []);

  // Supabase の user_subscriptions テーブルからサブスクリプション情報を直接取得する
  // API 経由だと Bearer token の有効期限切れで 401 になる問題があったため、
  // Supabase クライアントを直接使う（token refresh が内蔵されている）
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
        if (error || !data) return null;
        return {
          plan: data.plan as "free" | "premium",
          status: data.status as SubscriptionInfo["status"],
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          premiumExpiresAt: data.premium_expires_at ?? null,
          trialEnd: data.trial_end ?? null,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  // サブスクリプション情報を再取得する
  const refreshSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      return;
    }
    const sub = await fetchSubscription(user.id);
    if (sub !== null) setSubscription(sub);
  }, [user, fetchSubscription]);

  // ユーザーログイン時: RevenueCat ログイン & サブスクリプション取得
  useEffect(() => {
    if (user) {
      loginRevenueCat(user.id);
      fetchSubscription(user.id).then((sub) => {
        if (sub !== null) setSubscription(sub);
      });
    } else {
      setSubscription(null);
    }
  }, [user, fetchSubscription]);

  // RevenueCat の顧客情報変更リスナー: 購入/更新時にサブスクリプションを再取得
  useEffect(() => {
    if (!user) return;

    const removeListener = addCustomerInfoListener(() => {
      // RevenueCat 側で変更があった → Supabase からサブスクリプション情報を再取得
      // (RevenueCat Webhook が user_subscriptions を更新するため)
      if (user?.id) {
        fetchSubscription(user.id).then((sub) => {
          if (sub !== null) setSubscription(sub);
        });
      }
    });

    return removeListener;
  }, [user, fetchSubscription]);

  // ゲストからログインした場合、トークンを引き継ぎ＆ゲストモード解除
  useEffect(() => {
    if (user && wasGuestRef.current) {
      wasGuestRef.current = false;
      setIsGuest(false);
      // セッションの access_token でゲスト利用データを引き継ぐ
      if (session?.access_token) {
        migrateGuestTokens(session.access_token);
      }
    }
  }, [user, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Supabaseクライアントが初期化されていません") };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error };
      }
      setIsGuest(false);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Supabaseクライアントが初期化されていません") };
    }
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return { error };
      }
      setIsGuest(false);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return { error: new Error("Supabaseクライアントが初期化されていません") };
    }
    try {
      setTransitioning(true);

      await logoutRevenueCat();

      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localError) {
        console.error("Sign out error:", localError);
        return { error: localError as Error };
      }
    } finally {
      setSubscription(null);

      try {
        const { useScanResultStore } = await import("@/stores/scanResultStore");
        useScanResultStore.getState().reset();
      } catch {
        // ストアがまだ読み込まれていない場合は無視
      }
    }
    return { error: null };
  }, []);

  const enterGuestMode = useCallback(() => {
    wasGuestRef.current = true;
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isGuest,
    subscription,
    transitioning,
    signIn,
    signUp,
    signOut,
    enterGuestMode,
    exitGuestMode,
    refreshSubscription,
  }), [user, session, loading, isGuest, subscription, transitioning, signIn, signUp, signOut, enterGuestMode, exitGuestMode, refreshSubscription]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
