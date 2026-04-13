import "../lib/i18n";
import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "../contexts/AuthProvider";
import { supabase } from "../lib/supabase";
import { colors, fontSize } from "../theme";

/**
 * Supabase未初期化時のエラー画面
 */
function SupabaseErrorScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{t("settings.configError")}</Text>
      <Text style={styles.errorMessage}>
        {t("settings.configErrorMessage")}
      </Text>
    </View>
  );
}

/**
 * 認証状態に応じてルーティングをガード
 * ※ 審査対応: 未ログインでもスキャナー機能にアクセス可能にする
 *   スキャン機能はアカウント不要のため、常にゲストモードで開始
 */
function AuthGate() {
  const { isAuthenticated, isGuest, loading, transitioning, enterGuestMode } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const autoGuestDone = useRef(false);

  useEffect(() => {
    if (loading || transitioning) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !isGuest && !inAuthGroup) {
      // 未認証・非ゲスト・非authグループ → 自動ゲストモード
      if (!autoGuestDone.current) {
        autoGuestDone.current = true;
        enterGuestMode();
      }
    }
  }, [isAuthenticated, isGuest, loading, transitioning, segments, router, enterGuestMode]);

  if (!supabase) {
    return <SupabaseErrorScreen />;
  }

  if (loading || transitioning) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    try {
      const mobileAds = require("react-native-google-mobile-ads").default;
      mobileAds().initialize();
    } catch {
      // Ad module not available (e.g., running in Expo Go)
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: "#374151",
    textAlign: "center",
    lineHeight: 24,
  },
});
