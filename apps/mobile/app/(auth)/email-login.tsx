import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { colors, spacing, radius, fontSize } from "@/theme";
import { isValidEmail } from "@/utils/validateEmail";

export default function EmailLoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError(t("auth.emailLoginScreen.emailRequired"));
      return false;
    }
    if (!isValidEmail(email)) {
      setError(t("auth.emailLoginScreen.emailInvalid"));
      return false;
    }
    if (!password) {
      setError(t("auth.emailLoginScreen.passwordRequired"));
      return false;
    }
    return true;
  };

  const formatAuthError = (err: unknown): string => {
    const errorObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
    const msg = typeof errorObj.message === "string" ? errorObj.message.toLowerCase() : "";

    if (msg.includes("invalid") && (msg.includes("credentials") || msg.includes("email"))) {
      return t("auth.emailLoginScreen.invalidCredentials");
    }
    if (msg.includes("email not confirmed")) {
      return t("auth.emailLoginScreen.emailNotConfirmed");
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
      return t("auth.emailLoginScreen.rateLimited");
    }
    if (msg.includes("network") || msg.includes("connection")) {
      return t("auth.emailLoginScreen.networkError");
    }
    return t("auth.emailLoginScreen.loginFailed");
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(formatAuthError(authError));
      }
    } catch {
      setError(t("auth.emailLoginScreen.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      Alert.alert(
        t("auth.emailLoginScreen.resetEmailRequiredTitle"),
        t("auth.emailLoginScreen.resetEmailRequired"),
      );
      return;
    }

    if (!supabase) {
      Alert.alert(t("common.error"), t("auth.emailLoginScreen.resetFailed"));
      return;
    }

    setResetting(true);
    try {
      // reset-password 画面へ直接戻せるよう、パス付きの redirectTo を指定する
      // (_layout.tsx のグローバル deep link ハンドラがこのパスで recovery と判別する)。
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: "swimhub-scanner://reset-password",
      });

      if (resetError) {
        // 存在しないメールアドレスの場合、Supabase はメール列挙対策としてエラーを
        // 返さず成功と同じ扱いにする。ここに来るのはレート制限や設定不備など、
        // 実際にメール送信が行われなかったケースのみなので、失敗として伝える。
        const message = resetError.message?.toLowerCase() ?? "";
        const isRateLimited =
          message.includes("rate limit") || message.includes("too many requests");
        Alert.alert(
          t("common.error"),
          isRateLimited
            ? t("auth.emailLoginScreen.rateLimited")
            : t("auth.emailLoginScreen.resetFailed"),
        );
        return;
      }

      // アカウントの有無に関わらず同じメッセージを表示する（メール列挙対策）
      Alert.alert(
        t("auth.emailLoginScreen.resetSuccessTitle"),
        t("auth.emailLoginScreen.resetSuccessMessage"),
      );
    } catch {
      Alert.alert(t("common.error"), t("auth.emailLoginScreen.resetFailed"));
    } finally {
      setResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t("auth.emailLoginScreen.title")}</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.emailLabel")}</Text>
                <TextInput
                  testID="login-email-input"
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.mutedLight}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
                <TextInput
                  testID="login-password-input"
                  style={styles.input}
                  placeholder={t("auth.emailLoginScreen.passwordPlaceholder")}
                  placeholderTextColor={colors.mutedLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  editable={!loading}
                />
              </View>

              <Pressable
                testID="login-submit-button"
                style={({ pressed }) => [
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                  pressed && !loading && styles.submitButtonPressed,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>{t("auth.emailLoginScreen.submit")}</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.forgotPasswordText}>
                    {t("auth.emailLoginScreen.forgotPassword")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleSection: {
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: fontSize["3xl"],
    fontWeight: "bold",
    color: colors.text,
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
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
});
