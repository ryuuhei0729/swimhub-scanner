import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import { AppleLoginButton } from "@/components/auth/AppleLoginButton";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { colors, spacing, radius, fontSize } from "@/theme";

export default function GetStartedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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

  const isLoading = googleLoading || appleLoading;

  const handleAppleSignup = async () => {
    if (appleLoading) return;
    setError(null);
    clearAppleError();
    await signInWithApple();
  };

  const handleGoogleSignup = async () => {
    if (googleLoading) return;
    setError(null);
    clearGoogleError();
    await signInWithGoogle();
  };

  const displayError = error || googleError || appleError;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Image source={require("@/assets/icon.png")} style={styles.appIcon} />
          <Text style={styles.title}>{t("auth.getStarted.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.getStarted.subtitle")}</Text>
        </View>

        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {isAppleAvailable && (
            <AppleLoginButton
              onPress={handleAppleSignup}
              loading={appleLoading}
              disabled={isLoading}
              label={t("auth.getStarted.withApple")}
            />
          )}

          <GoogleLoginButton
            onPress={handleGoogleSignup}
            loading={googleLoading}
            disabled={isLoading}
            label={t("auth.getStarted.withGoogle")}
          />

          <Pressable
            style={({ pressed }) => [
              styles.emailButton,
              isLoading && styles.buttonDisabled,
              pressed && !isLoading && styles.emailButtonPressed,
            ]}
            onPress={() => router.push("/(auth)/email-signup")}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={t("auth.getStarted.withEmail")}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <View style={styles.emailButtonContent}>
                <Feather name="mail" size={20} color={colors.textSecondary} />
                <Text style={styles.emailButtonText}>{t("auth.getStarted.withEmail")}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          {t("auth.termsAgreement")}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://scanner.swim-hub.app/terms")}
          >
            {t("auth.terms")}
          </Text>
          {t("auth.and")}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://scanner.swim-hub.app/privacy")}
          >
            {t("auth.privacy")}
          </Text>
          {t("auth.termsAgreementEnd")}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
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
  legalContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: "center",
  },
  legalText: {
    fontSize: fontSize.sm,
    color: colors.mutedLight,
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: "500",
  },
});
