import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { deleteAccount, ApiError } from "@/lib/api-client";
import { restorePurchases } from "@/lib/revenucat";
import { colors, spacing, radius, fontSize } from "@/theme";
import { PlanFeatureList } from "@/components/plan/PlanFeatureList";

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, signOut, subscription, refreshSubscription } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isPremium =
    subscription?.plan === "premium" &&
    (subscription?.status === "active" || subscription?.status === "trialing");

  // トライアル残日数を計算
  const trialDaysRemaining = (() => {
    if (subscription?.status !== "trialing" || !subscription?.trialEnd) return null;
    const end = new Date(subscription.trialEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  })();

  // 次回更新日のフォーマット
  const renewalDateFormatted = (() => {
    if (!subscription?.premiumExpiresAt) return null;
    const date = new Date(subscription.premiumExpiresAt);
    return date.toLocaleDateString("ja-JP");
  })();

  // リストア処理
  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      await refreshSubscription();
      Alert.alert(t("accountScreen.restoreSuccess"), t("accountScreen.restoreSuccessMessage"));
    } catch {
      Alert.alert(t("accountScreen.restoreError"), t("accountScreen.restoreErrorMessage"));
    } finally {
      setRestoring(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t("accountScreen.logoutTitle"), t("accountScreen.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert(t("common.error"), t("accountScreen.logoutFailed"));
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("auth.deleteAccountTitle"),
      t("auth.deleteAccountStep1"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.next"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("auth.deleteAccountFinalTitle"),
              t("auth.deleteAccountStep2"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("auth.deleteAccountButton"),
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      await signOut();
                    } catch (err) {
                      const message =
                        err instanceof ApiError
                          ? err.message
                          : t("auth.deleteAccountFailed");
                      Alert.alert(t("common.error"), message);
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* アカウント情報（メール + プラン） */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("accountScreen.accountInfo")}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("accountScreen.email")}</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("accountScreen.plan")}</Text>
              <View style={[styles.badge, isPremium ? styles.premiumBadge : styles.freeBadge]}>
                <Text
                  style={[
                    styles.badgeText,
                    isPremium ? styles.premiumBadgeText : styles.freeBadgeText,
                  ]}
                >
                  {isPremium ? "Premium" : "Free"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* サブスクリプション詳細 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("accountScreen.subscription")}</Text>
          <View style={styles.infoCard}>
            {isPremium ? (
              <>
                {/* トライアル中 */}
                {subscription?.status === "trialing" && trialDaysRemaining && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t("accountScreen.trialRemaining")}</Text>
                    <Text style={styles.trialText}>{t("accountScreen.trialDays", { days: trialDaysRemaining })}</Text>
                  </View>
                )}

                {/* 次回更新日 */}
                {renewalDateFormatted && (
                  <>
                    {subscription?.status === "trialing" && trialDaysRemaining && (
                      <View style={styles.divider} />
                    )}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>
                        {subscription?.cancelAtPeriodEnd ? t("accountScreen.expiresAt") : t("accountScreen.renewsAt")}
                      </Text>
                      <Text style={styles.infoValue}>{renewalDateFormatted}</Text>
                    </View>
                  </>
                )}

                {/* 解約状態の表示 */}
                {subscription?.cancelAtPeriodEnd && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.canceledNote}>
                      {t("accountScreen.canceledNote")}
                    </Text>
                  </>
                )}
              </>
            ) : (
              <>
                <PlanFeatureList currentPlan="free" />
                <View style={styles.divider} />
                <Text style={styles.upgradePrompt}>
                  {t("accountScreen.upgradePrompt")}
                </Text>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => router.push("/(app)/paywall")}
                >
                  <Text style={styles.upgradeButtonText}>{t("accountScreen.upgradeToPremium")}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* リストア購入 */}
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.restoreRow}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.restoreText}>{t("accountScreen.restorePurchases")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ログアウト */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>{t("common.logout")}</Text>
          </TouchableOpacity>
        </View>

        {/* アカウント削除 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={colors.destructive} />
            ) : (
              <Text style={styles.deleteButtonText}>{t("auth.deleteAccount")}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.deleteWarning}>{t("auth.deleteAccountWarning")}</Text>
        </View>

        {/* サブスクリプション管理 */}
        <TouchableOpacity
          style={styles.manageSubButton}
          onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")}
        >
          <Text style={styles.manageSubText}>{t("accountScreen.manageSubscription")}</Text>
        </TouchableOpacity>

        {/* 利用規約・プライバシーポリシー */}
        <View style={styles.legalLinks}>
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://scanner.swim-hub.app/terms")}
          >
            {t("accountScreen.termsLink")}
          </Text>
          <Text style={styles.legalDivider}> | </Text>
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://scanner.swim-hub.app/privacy")}
          >
            {t("accountScreen.privacyLink")}
          </Text>
        </View>

        {/* アプリ情報 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SwimHub Scanner v{appVersion}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.muted,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  badge: {
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeBadge: {
    backgroundColor: colors.surfaceRaised,
  },
  premiumBadge: {
    backgroundColor: colors.warningBackground,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  freeBadgeText: {
    color: colors.muted,
  },
  premiumBadgeText: {
    color: colors.amber,
  },
  trialText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: "600",
  },
  canceledNote: {
    fontSize: fontSize.md,
    color: colors.destructive,
    textAlign: "center",
  },
  upgradePrompt: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  restoreRow: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  restoreText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.destructiveLight,
  },
  signOutButtonText: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  deleteButtonText: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  deleteWarning: {
    fontSize: fontSize.sm,
    color: colors.mutedLight,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  manageSubButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  manageSubText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  legalLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  legalDivider: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.mutedLight,
  },
});
