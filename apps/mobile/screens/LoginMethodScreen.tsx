import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import { AppleLoginButton } from "@/components/auth/AppleLoginButton";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import type { MainStackParamList } from "@/navigation/types";

export const LoginMethodScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Image source={require("@/assets/icon.png")} style={styles.appIcon} />
          <Text style={styles.title}>ログイン</Text>
          <Text style={styles.subtitle}>SwimHub Scannerへようこそ</Text>
        </View>

        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {isAppleAvailable && (
            <AppleLoginButton
              onPress={handleAppleLogin}
              loading={appleLoading}
              disabled={isLoading}
              label="Appleでログイン"
            />
          )}

          <GoogleLoginButton
            onPress={handleGoogleLogin}
            loading={googleLoading}
            disabled={isLoading}
            label="Googleでログイン"
          />

          <Pressable
            style={({ pressed }) => [
              styles.emailButton,
              isLoading && styles.buttonDisabled,
              pressed && !isLoading && styles.emailButtonPressed,
            ]}
            onPress={() => navigation.navigate("EmailLogin")}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Emailでログイン"
          >
            {isLoading ? (
              <ActivityIndicator color="#374151" size="small" />
            ) : (
              <View style={styles.emailButtonContent}>
                <Feather name="mail" size={20} color="#374151" />
                <Text style={styles.emailButtonText}>Emailでログイン</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable
          style={styles.signupLink}
          onPress={() => navigation.navigate("EmailSignup")}
          accessibilityRole="button"
          accessibilityLabel="アカウントを新規作成"
        >
          <Text style={styles.signupLinkText}>
            アカウントをお持ちでない方は<Text style={styles.signupLinkBold}>新規登録</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
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
    width: 180,
    height: 180,
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
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    minHeight: 48,
  },
  emailButtonPressed: {
    backgroundColor: "#F3F4F6",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emailButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  signupLink: {
    marginTop: 24,
    alignItems: "center",
  },
  signupLinkText: {
    fontSize: 14,
    color: "#6B7280",
  },
  signupLinkBold: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
