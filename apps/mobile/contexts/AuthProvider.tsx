import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { CustomerInfo } from "react-native-purchases";
import { supabase, clearMmkvCaches } from "@/lib/supabase";
import { getGuestTodayCount, clearGuestUsage } from "@/lib/guest-daily-limit";
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  addCustomerInfoListener,
  PREMIUM_ENTITLEMENT_ID,
} from "@/lib/revenucat";
import type { ScannerMobileAuthContextType, SubscriptionInfo } from "@swimhub-scanner/shared/types/auth";
import { useAuthState } from "@swimhub-scanner/shared/hooks";
import { env } from "@/lib/env";

const API_BASE_URL = env.webApiUrl;

/** サブスクリプション情報付きの認証コンテキスト型 */
export type AuthContextType = ScannerMobileAuthContextType & {
  subscription: SubscriptionInfo | null;
  refreshSubscription: () => Promise<void>;
  /**
   * RevenueCat の CustomerInfo を一次ソースとしてローカルの subscription を即時反映する。
   * Supabase (Webhook 反映先) が追いつくまでの数秒間、購入直後に広告や上限バナーが
   * 誤表示されるのを防ぐ。反映後に Supabase 側の正データで追認（リトライ）する。
   */
  applyCustomerInfo: (info: CustomerInfo) => void;
  /** 認証状態の遷移中（ログイン/ログアウト直後）に true になる */
  transitioning: boolean;
  /**
   * パスワードリセット (recovery) の deep link 処理中に true になる。
   * exchangeCodeForSession の SIGNED_IN 通知は種別 (recovery か通常サインインか) が
   * 判明する前に飛ぶため、AuthGate の「ログイン済みなら (app) へ」自動遷移を
   * 一時的に抑止するために使う。判明した時点で呼び出し側が false に戻す。
   */
  pendingRecoveryCheck: boolean;
  setPendingRecoveryCheck: (pending: boolean) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ゲストのローカル利用データをサーバーに引き継ぎ、ローカルをクリアする
 */
async function migrateGuestTokens(accessToken: string): Promise<void> {
  try {
    const todayCount = await getGuestTodayCount();
    const res = await fetch(`${API_BASE_URL}/api/user/migrate-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ guestTodayCount: todayCount }),
    });
    // サーバー側の引き継ぎが失敗した場合はローカルを消さない（利用データ消失防止）
    if (!res.ok) return;
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
  const [pendingRecoveryCheck, setPendingRecoveryCheck] = useState(false);
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

  // Supabase (Webhook 反映先) の正データを数回リトライで追認する
  // 楽観適用 (applyCustomerInfo) の後始末としてのみ呼ばれるため、premium を確認できた
  // 場合のみ採用する。Supabase 側の Webhook 反映が遅れて plan=free を返しているだけの
  // 可能性があり、ここで無条件に free を採用すると購入直後の楽観 premium を
  // 巻き戻してしまう (R2)。全リトライで premium を確認できなかった場合も、
  // RC entitlement が実在した場合のみ楽観 premium にしているため、その状態を
  // そのまま維持してよい（巻き戻さない）。
  const reconcileSubscriptionWithRetry = useCallback(
    async (userId: string) => {
      const delaysMs = [1500, 3000, 6000];
      for (const delayMs of delaysMs) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const sub = await fetchSubscription(userId);
        if (sub?.plan === "premium") {
          setSubscription(sub);
          return;
        }
      }
    },
    [fetchSubscription],
  );

  // RevenueCat の CustomerInfo を一次ソースにローカル subscription を即時反映する
  // 楽観適用は premium への昇格方向のみ行う (R4)。web の Stripe 課金者は RC entitlement
  // を持たないため、entitlement が無いことをもって free に降格すると、起動/フォアグラウンド
  // 復帰時に customerInfo リスナー経由で誤って premium→free に落ちてしまう。
  // 降格は必ず Supabase (server 権威) の追認 (reconcileSubscriptionWithRetry) に委ねる。
  const applyCustomerInfo = useCallback(
    (info: CustomerInfo) => {
      const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
      if (entitlement) {
        setSubscription((prev) => ({
          plan: "premium",
          status: entitlement.periodType === "TRIAL" ? "trialing" : "active",
          cancelAtPeriodEnd: !entitlement.willRenew,
          premiumExpiresAt: entitlement.expirationDate,
          trialEnd:
            entitlement.periodType === "TRIAL"
              ? entitlement.expirationDate
              : (prev?.trialEnd ?? null),
        }));
      }
      // entitlement が無い場合はここでは free に降格しない。降格が正当かどうかの判断は
      // reconcileSubscriptionWithRetry 経由の Supabase 追認に委ねる。

      if (user?.id) {
        void reconcileSubscriptionWithRetry(user.id);
      }
    },
    [user, reconcileSubscriptionWithRetry],
  );

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

  // RevenueCat の顧客情報変更リスナー: 購入/更新/リストア時に一次ソースとして即時反映
  useEffect(() => {
    if (!user) return;

    const removeListener = addCustomerInfoListener((info) => {
      applyCustomerInfo(info);
    });

    return removeListener;
  }, [user, applyCustomerInfo]);

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

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!supabase) {
      return { error: new Error("Supabaseクライアントが初期化されていません") };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          // 確認メールのリンク先をブラウザ(LP)ではなくアプリに戻す。
          // パス無しの bare スキームのため、_layout.tsx のグローバル deep link
          // ハンドラでは hostname/path が null になり、`auth/callback` (Google OAuth) や
          // `reset-password` (パスワードリセット) のパスマーカーとは衝突しない。
          emailRedirectTo: "swimhub-scanner://",
        },
      });
      if (error) {
        return { error };
      }
      // Supabase は Confirm Email 有効時、登録済みメールでも error を返さず
      // identities が空配列の user を返す（メール列挙対策のデフォルト挙動）。
      // 確認メールも実際には送信されないため、明示的にエラーへ変換する。
      if (data?.user && (data.user.identities?.length ?? 0) === 0) {
        return { error: new Error("User already registered") };
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
      clearMmkvCaches();

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
    pendingRecoveryCheck,
    setPendingRecoveryCheck,
    signIn,
    signUp,
    signOut,
    enterGuestMode,
    exitGuestMode,
    refreshSubscription,
    applyCustomerInfo,
  }), [user, session, loading, isGuest, subscription, transitioning, pendingRecoveryCheck, signIn, signUp, signOut, enterGuestMode, exitGuestMode, refreshSubscription, applyCustomerInfo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
