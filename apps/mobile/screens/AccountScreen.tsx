import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
  const [loading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isPremium =
    subscription?.plan === "premium" &&
    (subscription?.status === "active" || subscription?.status === "trialing");

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
      "アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。",
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
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* ユーザー情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント情報</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>メールアドレス</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
            {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#2563EB" />}
          </View>
        </View>

        {/* サブスクリプション情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プラン</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>現在のプラン</Text>
              <View style={styles.planBadgeRow}>
                {isPremium ? (
                  <View style={styles.premiumBadge}>
                    <Feather name="zap" size={12} color="#F59E0B" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>Free</Text>
                )}
              </View>
            </View>
            {subscription?.status === "trialing" && subscription?.trialEnd && (
              <View style={[styles.infoRow, { marginTop: 8 }]}>
                <Text style={styles.infoLabel}>トライアル終了</Text>
                <Text style={styles.infoValue}>
                  {new Date(subscription.trialEnd).toLocaleDateString("ja-JP")}
                </Text>
              </View>
            )}
            {isPremium && subscription?.premiumExpiresAt && (
              <View style={[styles.infoRow, { marginTop: 8 }]}>
                <Text style={styles.infoLabel}>次回更新日</Text>
                <Text style={styles.infoValue}>
                  {new Date(subscription.premiumExpiresAt).toLocaleDateString("ja-JP")}
                </Text>
              </View>
            )}
          </View>
          {!isPremium && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate("Paywall")}
            >
              <Text style={styles.upgradeButtonText}>Premium にアップグレード</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 購入の復元 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>購入を復元する</Text>
            )}
          </TouchableOpacity>
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
    fontSize: 14,
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
  planBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#92400E",
  },
  upgradeButton: {
    marginTop: 12,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  restoreButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  restoreButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
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
