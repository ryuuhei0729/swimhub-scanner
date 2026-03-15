import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.webApiUrl || "https://scanner.swim-hub.app";

/** サブスクリプション情報付きの認証コンテキスト型 */
export type AuthContextType = ScannerMobileAuthContextType & {
  subscription: SubscriptionInfo | null;
  refreshSubscription: () => Promise<void>;
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

/**
 * Supabase の user_subscriptions テーブルからサブスクリプション情報を取得する
 */
async function fetchSubscriptionFromDB(accessToken: string): Promise<SubscriptionInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // UserStatusResponse から SubscriptionInfo を構築
    return {
      plan: data.plan === "premium" ? "premium" : "free",
      status: data.subscriptionStatus ?? null,
      cancelAtPeriodEnd: false,
      premiumExpiresAt: data.premiumExpiresAt ?? null,
      trialEnd: null,
    };
  } catch (err) {
    console.error("サブスクリプション情報の取得に失敗:", err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuthState(supabase);
  const [isGuest, setIsGuest] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const wasGuestRef = useRef(false);

  // RevenueCat SDK の初期化
  useEffect(() => {
    initRevenueCat();
  }, []);

  // サブスクリプション情報を再取得する
  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(null);
      return;
    }
    const sub = await fetchSubscriptionFromDB(session.access_token);
    setSubscription(sub);
  }, [session]);

  // ユーザーログイン時: RevenueCat ログイン & サブスクリプション取得
  useEffect(() => {
    if (user && session?.access_token) {
      loginRevenueCat(user.id);
      fetchSubscriptionFromDB(session.access_token).then(setSubscription);
    } else {
      setSubscription(null);
    }
  }, [user, session]);

  // RevenueCat の顧客情報変更リスナー: 購入/更新時にサブスクリプションを再取得
  useEffect(() => {
    if (!user || !session?.access_token) return;

    const removeListener = addCustomerInfoListener(() => {
      // RevenueCat 側で変更があった → Supabase からサブスクリプション情報を再取得
      // (RevenueCat Webhook が user_subscriptions を更新するため)
      if (session?.access_token) {
        fetchSubscriptionFromDB(session.access_token).then(setSubscription);
      }
    });

    return removeListener;
  }, [user, session]);

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
      // RevenueCat からログアウト
      await logoutRevenueCat();

      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error };
      }

      // サブスクリプション情報をクリア
      setSubscription(null);

      // Zustand ストアをリセット
      try {
        const { useScanResultStore } = await import("@/stores/scanResultStore");
        useScanResultStore.getState().reset();
      } catch {
        // ストアがまだ読み込まれていない場合は無視
      }

      return { error: null };
    } catch (error) {
      console.error("Sign out error:", error);
      return { error: error as Error };
    }
  }, []);

  const enterGuestMode = useCallback(() => {
    wasGuestRef.current = true;
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isGuest,
    subscription,
    signIn,
    signUp,
    signOut,
    enterGuestMode,
    exitGuestMode,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
