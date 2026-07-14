import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { colors, spacing, radius, fontSize } from "@/theme";
import { validatePassword, type PasswordChecks } from "@/utils/validatePassword";

/**
 * パスワードリセット (recovery) の deep link から遷移してくる画面。
 * `_layout.tsx` の AuthGate が exchangeCodeForSession の戻り値から
 * PASSWORD_RECOVERY を検出し、この画面へ router.replace する。
 * 遷移してきた時点で recovery セッションが確立済みのため、
 * updateUser({ password }) だけで新しいパスワードを設定できる。
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut, setPendingRecoveryCheck } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  // Android バック / iOS スワイプなど、submit/cancel を経由せずにこの画面を離脱した場合に
  // pendingRecoveryCheck が true のまま残ると、AuthGate の自動遷移ガードが以後ずっと
  // 働き続け、ログインしても (app) へ遷移できなくなる。アンマウント時に必ず解放する。
  useEffect(() => () => setPendingRecoveryCheck(false), [setPendingRecoveryCheck]);

  const validateForm = (): boolean => {
    if (!password) {
      setError(t("auth.resetPasswordScreen.passwordRequired"));
      return false;
    }
    const checks = passwordValidation.checks;
    if (!checks.minLength) {
      setError(t("auth.resetPasswordScreen.passwordTooShort"));
      return false;
    }
    if (!checks.lowercase) {
      setError(t("auth.passwordMissingLowercase"));
      return false;
    }
    if (!checks.uppercase) {
      setError(t("auth.passwordMissingUppercase"));
      return false;
    }
    if (!checks.digit) {
      setError(t("auth.passwordMissingDigit"));
      return false;
    }
    if (!checks.symbol) {
      setError(t("auth.passwordMissingSymbol"));
      return false;
    }
    if (password !== confirmPassword) {
      setError(t("auth.resetPasswordScreen.passwordMismatch"));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!supabase) {
      setError(t("auth.resetPasswordScreen.updateFailed"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(t("auth.resetPasswordScreen.updateFailed"));
        return;
      }
      // 完了: AuthGate の自動遷移抑止を解除してメイン画面へ
      setPendingRecoveryCheck(false);
      router.replace("/(app)");
    } catch {
      setError(t("auth.resetPasswordScreen.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // recovery セッションのまま留まりたくないユーザー向けの離脱導線
  const handleCancel = async () => {
    setCancelling(true);
    try {
      // signOut 完了後に解放・遷移する。先に pendingRecoveryCheck を false に戻すと、
      // signOut のネットワーク待ちと transitioning の自動解除 (400ms) が競合し、
      // 一瞬 (app) へ遷移し得る窓が開くため、signOut → 解放 → 遷移の順序を守る。
      const { error: signOutError } = await signOut();
      if (signOutError) {
        // サインアウトできていないのに認証ガードだけ解除すると、recovery セッションの
        // ままアプリ内へ遷移し得るため、失敗時はこの画面に留まる。
        setError(t("auth.resetPasswordScreen.unexpectedError"));
        return;
      }
      setPendingRecoveryCheck(false);
      router.replace("/(auth)/login-method");
    } finally {
      setCancelling(false);
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
              <Text style={styles.title}>{t("auth.resetPasswordScreen.title")}</Text>
              <Text style={styles.subtitle}>{t("auth.resetPasswordScreen.subtitle")}</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.resetPasswordScreen.newPasswordLabel")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={colors.mutedLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  textContentType="newPassword"
                  editable={!loading}
                />
                <PasswordRequirementsList checks={passwordValidation.checks} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t("auth.resetPasswordScreen.confirmPasswordLabel")}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.resetPasswordScreen.confirmPasswordPlaceholder")}
                  placeholderTextColor={colors.mutedLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  textContentType="newPassword"
                  editable={!loading}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                  pressed && !loading && styles.submitButtonPressed,
                ]}
                onPress={handleSubmit}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={t("auth.resetPasswordScreen.submit")}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t("auth.resetPasswordScreen.submit")}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={cancelling || loading}
                accessibilityRole="button"
                accessibilityLabel={t("auth.backToLogin")}
              >
                {cancelling ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.cancelButtonText}>{t("auth.backToLogin")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordRequirementsList({ checks }: { checks: PasswordChecks }) {
  const { t } = useTranslation();
  const items: { key: keyof PasswordChecks; label: string }[] = [
    { key: "minLength", label: t("auth.passwordRequirements.minLength") },
    { key: "lowercase", label: t("auth.passwordRequirements.lowercase") },
    { key: "uppercase", label: t("auth.passwordRequirements.uppercase") },
    { key: "digit", label: t("auth.passwordRequirements.digit") },
    { key: "symbol", label: t("auth.passwordRequirements.symbol") },
  ];
  return (
    <View style={styles.requirements}>
      <Text style={styles.requirementsTitle}>{t("auth.passwordRequirements.title")}</Text>
      {items.map(({ key, label }) => {
        const met = checks[key];
        return (
          <View key={key} style={styles.requirementRow}>
            <Ionicons
              name={met ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={met ? "#10B981" : colors.mutedLight}
            />
            <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{label}</Text>
          </View>
        );
      })}
    </View>
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
  subtitle: {
    fontSize: fontSize.base,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: "center",
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
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  requirements: {
    marginTop: spacing.xs,
    gap: 4,
  },
  requirementsTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requirementText: {
    fontSize: fontSize.sm,
    color: colors.mutedLight,
  },
  requirementTextMet: {
    color: "#10B981",
  },
});
