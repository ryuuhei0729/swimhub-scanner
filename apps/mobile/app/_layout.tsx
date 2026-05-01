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
 * 初回起動時は get-started 画面に誘導し、ユーザーがゲスト利用を選んだ場合のみゲストモードに入る
 * （スキャン機能はアカウント不要なので、get-started にゲスト利用ボタンを用意する）
 */
function AuthGate() {
  const { user, isAuthenticated, isGuest, loading, transitioning } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const redirectDone = useRef(false);
  const prevAuthStateRef = useRef({ user: !!user, isGuest });
  const prevSegmentsRef = useRef<string | undefined>(segments[0]);

  useEffect(() => {
    if (loading || transitioning) return;

    const prevUser = prevAuthStateRef.current.user;
    const prevIsGuest = prevAuthStateRef.current.isGuest;
    if (prevUser !== !!user || prevIsGuest !== isGuest) {
      redirectDone.current = false;
      prevAuthStateRef.current = { user: !!user, isGuest };
    }

    // ルートグループが変わったら再評価する (deep-link や手動遷移をガード)
    if (prevSegmentsRef.current !== segments[0]) {
      redirectDone.current = false;
      prevSegmentsRef.current = segments[0];
    }

    if (redirectDone.current) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !isGuest && !inAuthGroup) {
      redirectDone.current = true;
      router.replace("/(auth)/get-started");
    } else if (!!user && inAuthGroup) {
      redirectDone.current = true;
      router.replace("/(app)");
    }
  }, [user, isAuthenticated, isGuest, loading, transitioning, segments, router]);

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
