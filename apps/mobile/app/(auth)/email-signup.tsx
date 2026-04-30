import React, { useMemo, useState } from "react";
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
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { colors, spacing, radius, fontSize } from "@/theme";
import { validatePassword, type PasswordChecks } from "@/utils/validatePassword";

export default function EmailSignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError(t("auth.nameRequired"));
      return false;
    }
    if (!email.trim()) {
      setError(t("auth.emailSignupScreen.emailRequired"));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("auth.emailSignupScreen.emailInvalid"));
      return false;
    }
    if (!password) {
      setError(t("auth.emailSignupScreen.passwordRequired"));
      return false;
    }
    const checks = passwordValidation.checks;
    if (!checks.minLength) {
      setError(t("auth.emailSignupScreen.passwordTooShort"));
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
    return true;
  };

  const formatAuthError = (err: unknown): string => {
    const errorObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
    const msg = typeof errorObj.message === "string" ? errorObj.message.toLowerCase() : "";

    if (msg.includes("user already registered")) {
      return t("auth.emailSignupScreen.alreadyRegistered");
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
      return t("auth.emailSignupScreen.rateLimited");
    }
    if (msg.includes("network") || msg.includes("connection")) {
      return t("auth.emailSignupScreen.networkError");
    }
    return t("auth.emailSignupScreen.signupFailed");
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await signUp(email, password, name.trim());
      if (authError) {
        setError(formatAuthError(authError));
      } else {
        Alert.alert(
          t("auth.confirmEmailSent"),
          t("auth.confirmEmailDesc"),
          [{ text: t("common.ok"), onPress: () => router.back() }],
        );
      }
    } catch {
      setError(t("auth.emailSignupScreen.unexpectedError"));
    } finally {
      setLoading(false);
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
              <Text style={styles.title}>{t("auth.emailSignupScreen.title")}</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.nameLabel")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.namePlaceholder")}
                  placeholderTextColor={colors.mutedLight}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  textContentType="name"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.emailLabel")}</Text>
                <TextInput
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
                  style={styles.input}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={colors.mutedLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="newPassword"
                  editable={!loading}
                />
                <PasswordRequirementsList checks={passwordValidation.checks} />
              </View>

              <Pressable
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
                  <Text style={styles.submitButtonText}>{t("auth.emailSignupScreen.submit")}</Text>
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
  legalContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
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
