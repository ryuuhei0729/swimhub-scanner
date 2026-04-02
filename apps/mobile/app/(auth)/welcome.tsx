import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthProvider";
import { PLAN_LIMITS } from "@swimhub-scanner/shared";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { enterGuestMode } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require("@/assets/icon.png")} style={styles.appIcon} />
          <Text style={styles.appName}>{t("common.appName")}</Text>
          <Text style={styles.tagline}>{t("auth.welcome.tagline")}</Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={() => router.push("/(auth)/get-started")}
          accessibilityRole="button"
          accessibilityLabel={t("auth.welcome.getStarted")}
        >
          <Text style={styles.primaryButtonText}>{t("auth.welcome.getStarted")}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={() => router.push("/(auth)/login-method")}
          accessibilityRole="button"
          accessibilityLabel={t("auth.welcome.login")}
        >
          <Text style={styles.secondaryButtonText}>{t("auth.welcome.login")}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.guestButton, pressed && styles.guestButtonPressed]}
          onPress={enterGuestMode}
          accessibilityRole="button"
          accessibilityLabel={t("auth.guestMode")}
        >
          <Text style={styles.guestButtonText}>
            {t("auth.guestModeWithLimit", { limit: PLAN_LIMITS.guest.dailyScanLimit })}
          </Text>
        </Pressable>
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
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    gap: 16,
  },
  appIcon: {
    width: 180,
    height: 180,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  tagline: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    backgroundColor: "#1D4ED8",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryButtonPressed: {
    backgroundColor: "#F3F4F6",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 17,
    fontWeight: "600",
  },
  guestButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  guestButtonPressed: {
    opacity: 0.6,
  },
  guestButtonText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
