import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getGuestTodayCount, clearGuestUsage } from "@/lib/guest-daily-limit";
import type { ScannerMobileAuthContextType } from "@swimhub-scanner/shared/types/auth";
import { useAuthState } from "@swimhub-scanner/shared/hooks";
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.webApiUrl || "https://scanner.swim-hub.app";

export type AuthContextType = ScannerMobileAuthContextType;

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
  const wasGuestRef = useRef(false);

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
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error };
      }

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
    signIn,
    signUp,
    signOut,
    enterGuestMode,
    exitGuestMode,
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
