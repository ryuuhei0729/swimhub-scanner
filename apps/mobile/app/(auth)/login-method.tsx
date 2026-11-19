import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useSegments } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import { AppleLoginButton } from "@/components/auth/AppleLoginButton";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { LastUsedBadge } from "@/components/auth/LastUsedBadge";
import { loadLastLoginMethod, type LoginMethod } from "@/lib/lastLoginMethod";
import { colors, spacing, radius, fontSize } from "@/theme";

/**
 * (auth)/(app) 両方のグループからこの画面が呼ばれる（ゲストが (app) 内からログインする
 * 導線もあるため）。所属グループを見て遷移先を切り替え、別グループのスタックへ
 * 迷い込まないようにする。
 */
export default function LoginMethodScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const emailLoginHref = segments[0] === "(app)" ? "/(app)/email-login" : "/(auth)/email-login";
  const {
    signInWithGoogle,
    loading: googleLoading,
    error: googleError,
    clearError: clearGoogleError,
  } = useGoogleAuth();
  const {
    signInWithApple,
    loading: appleLoading,
    error: appleError,
    clearError: clearAppleError,
    isAvailable: isAppleAvailable,
  } = useAppleAuth();
  const [error, setError] = useState<string | null>(null);
  const [lastLoginMethod, setLastLoginMethod] = useState<LoginMethod | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLastLoginMethod().then((method) => {
      if (!cancelled) setLastLoginMethod(method);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = googleLoading || appleLoading;

  // バッジは読み上げ対象外のため、該当ボタンの読み上げラベルに「直近で利用」を含める
  const a11yLabel = (method: LoginMethod, label: string) =>
    lastLoginMethod === method ? `${label}, ${t("auth.loginMethod.lastUsed")}` : label;

  const handleAppleLogin = async () => {
    if (appleLoading) return;
    setError(null);
    clearAppleError();
    await signInWithApple();
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setError(null);
    clearGoogleError();
    await signInWithGoogle();
  };

  const displayError = error || googleError || appleError;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Image source={require("@/assets/icon.png")} style={styles.appIcon} />
          <Text style={styles.title}>{t("auth.loginMethod.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.loginMethod.subtitle")}</Text>
        </View>

        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {isAppleAvailable && (
            <View>
              <AppleLoginButton
                onPress={handleAppleLogin}
                loading={appleLoading}
                disabled={isLoading}
                label={t("auth.loginMethod.withApple")}
                accessibilityLabel={a11yLabel("apple", t("auth.loginMethod.withApple"))}
              />
              {lastLoginMethod === "apple" && <LastUsedBadge testID="login-last-used-apple" />}
            </View>
          )}

          <View>
            <GoogleLoginButton
              onPress={handleGoogleLogin}
              loading={googleLoading}
              disabled={isLoading}
              label={t("auth.loginMethod.withGoogle")}
              accessibilityLabel={a11yLabel("google", t("auth.loginMethod.withGoogle"))}
            />
            {lastLoginMethod === "google" && <LastUsedBadge testID="login-last-used-google" />}
          </View>

          <View>
            <Pressable
              testID="login-email-method-button"
              style={({ pressed }) => [
                styles.emailButton,
                isLoading && styles.buttonDisabled,
                pressed && !isLoading && styles.emailButtonPressed,
              ]}
              onPress={() => router.push(emailLoginHref)}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel("email", t("auth.loginMethod.withEmail"))}
            >
              <View style={styles.emailButtonContent}>
                <Feather name="mail" size={20} color={colors.textSecondary} />
                <Text style={styles.emailButtonText}>{t("auth.loginMethod.withEmail")}</Text>
              </View>
            </Pressable>
            {lastLoginMethod === "email" && <LastUsedBadge testID="login-last-used-email" />}
          </View>
        </View>

        <Pressable
          style={styles.signupLink}
          onPress={() => router.push("/(auth)/get-started")}
          accessibilityRole="button"
          accessibilityLabel={t("auth.noAccountSignup")}
        >
          <Text style={styles.signupLinkText}>
            {t("auth.noAccount")}<Text style={styles.signupLinkBold}>{t("auth.noAccountSignup")}</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  appIcon: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: fontSize["4xl"],
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.muted,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: spacing.md,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 48,
  },
  emailButtonPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emailButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emailButtonText: {
    fontSize: fontSize.lg,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  signupLink: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  signupLinkText: {
    fontSize: fontSize.md,
    color: colors.muted,
  },
  signupLinkBold: {
    color: colors.primary,
    fontWeight: "600",
  },
});
