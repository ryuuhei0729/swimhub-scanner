import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { useAuth } from "@/contexts/AuthProvider";
import { deleteAccount, ApiError } from "@/lib/api-client";
import { restorePurchases } from "@/lib/revenucat";
import type { MainStackParamList } from "@/navigation/types";

export const AccountScreen: React.FC = () => {
  const { user, signOut, subscription, refreshSubscription } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
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
      Alert.alert("リストア完了", "購入情報を復元しました。");
    } catch {
      Alert.alert("リストアエラー", "購入情報の復元に失敗しました。");
    } finally {
      setRestoring(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert("エラー", "ログアウトに失敗しました");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "アカウント削除",
      "SwimHub、Scanner、Timer のアカウントが全て削除されます。よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "次へ",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "最終確認",
              "SwimHub で蓄積したタイム、動画、画像等のデータも全て削除されます。本当に削除しますか？",
              [
                { text: "キャンセル", style: "cancel" },
                {
                  text: "削除する",
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
                          : "アカウントの削除に失敗しました。再度お試しください。";
                      Alert.alert("エラー", message);
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
          <Text style={styles.sectionTitle}>アカウント情報</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>メールアドレス</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>プラン</Text>
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
          <Text style={styles.sectionTitle}>サブスクリプション</Text>
          <View style={styles.infoCard}>
            {isPremium ? (
              <>
                {/* トライアル中 */}
                {subscription?.status === "trialing" && trialDaysRemaining && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>トライアル残り</Text>
                    <Text style={styles.trialText}>{trialDaysRemaining}日</Text>
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
                        {subscription?.cancelAtPeriodEnd ? "有効期限" : "次回更新日"}
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
                      期間終了後にFreeプランに戻ります
                    </Text>
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.upgradePrompt}>
                  Premium にアップグレードして、無制限にスキャンしましょう
                </Text>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => navigation.navigate("Paywall")}
                >
                  <Text style={styles.upgradeButtonText}>Premium にアップグレード</Text>
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
                <ActivityIndicator color="#2563EB" size="small" />
              ) : (
                <Text style={styles.restoreText}>購入を復元する</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ログアウト */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>ログアウト</Text>
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
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.deleteButtonText}>アカウントを削除</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.deleteWarning}>すべてのデータが完全に削除されます</Text>
        </View>

        {/* アプリ情報 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SwimHub Scanner v{appVersion}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeBadge: {
    backgroundColor: "#F3F4F6",
  },
  premiumBadge: {
    backgroundColor: "#FEF3C7",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  freeBadgeText: {
    color: "#6B7280",
  },
  premiumBadgeText: {
    color: "#92400E",
  },
  trialText: {
    fontSize: 15,
    color: "#2563EB",
    fontWeight: "600",
  },
  canceledNote: {
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
  },
  upgradePrompt: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  restoreRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  restoreText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "500",
  },
  signOutButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  signOutButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "600",
  },
  deleteWarning: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
