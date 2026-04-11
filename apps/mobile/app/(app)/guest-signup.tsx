import React, { useState } from "react";
import { View, Text, StyleSheet, Linking, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import { AppleLoginButton } from "@/components/auth/AppleLoginButton";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";

export default function GuestSignupScreen() {
  const { t } = useTranslation();
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
  const [error] = useState<string | null>(null);

  const isLoading = googleLoading || appleLoading;

  const handleAppleSignup = async () => {
    if (appleLoading) return;
    clearAppleError();
    await signInWithApple();
  };

  const handleGoogleSignup = async () => {
    if (googleLoading) return;
    clearGoogleError();
    await signInWithGoogle();
  };

  const displayError = error || googleError || appleError;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Image source={require("@/assets/icon.png")} style={styles.appIcon} />
          <Text style={styles.title}>{t("auth.guestSignup.title")}</Text>
          <Text style={styles.subtitle}>
            {t("auth.guestSignup.subtitle")}
          </Text>
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
              label={t("auth.guestSignup.withApple")}
            />
          )}

          <GoogleLoginButton
            onPress={handleGoogleSignup}
            loading={googleLoading}
            disabled={isLoading}
            label={t("auth.guestSignup.withGoogle")}
          />
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
    backgroundColor: "#EFF6FF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  appIcon: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  legalContainer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    alignItems: "center",
  },
  legalText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    color: "#2563EB",
    fontWeight: "500",
  },
});
