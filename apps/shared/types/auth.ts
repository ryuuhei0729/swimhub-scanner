// =============================================================================
// 認証関連の型定義 - SwimHub Scanner共通パッケージ
// Web/Mobile共通で使用する認証関連の型定義
// =============================================================================

import type { User, Session } from "@supabase/supabase-js";

// =============================================================================
// 1. 3アプリ共通の認証ベース型 (AuthState / AuthActions / AuthContextValue)
// =============================================================================

/** 3アプリ共通の認証状態 */
export type BaseAuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

/** 3アプリ共通の認証アクション */
export type BaseAuthActions = {
  signOut: () => Promise<void>;
};

/** 3アプリ共通の認証コンテキスト値 */
export type BaseAuthContextValue = BaseAuthState & BaseAuthActions;

// =============================================================================
// 2. サブスクリプション型定義 (3アプリ共通)
// =============================================================================

export type UserPlan = "guest" | "free" | "premium";
export type SubscriptionStatus = "trialing" | "active" | "canceled" | "expired" | "past_due";

export interface SubscriptionInfo {
  plan: UserPlan;
  status: SubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  premiumExpiresAt: string | null;
  trialEnd: string | null;
}

// =============================================================================
// 3. scanner 固有の認証コンテキスト型
// =============================================================================

/** scanner web 用の認証コンテキスト (session を省略、ゲストモード対応) */
export interface ScannerWebAuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  subscription: SubscriptionInfo | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  refreshSubscription: () => Promise<void>;
}

/** scanner mobile 用の認証コンテキスト (BaseAuthState を拡張) */
export interface ScannerMobileAuthContextType extends BaseAuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}
