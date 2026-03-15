/**
 * ペイウォール画面
 * RevenueCat の offerings から月額/年額プランを表示し、購入・リストアを行う
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PurchasesPackage } from "react-native-purchases";
import { getOfferings, purchasePackage, restorePurchases } from "@/lib/revenucat";
import { useAuth } from "@/contexts/AuthProvider";
import type { MainStackParamList } from "@/navigation/types";

type BillingPeriod = "monthly" | "annual";

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { subscription, refreshSubscription } = useAuth();

  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("annual");
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);

  // トライアル済みかどうか（subscription に trialEnd があれば既にトライアル経験あり）
  const hasTrialed = subscription?.trialEnd !== null && subscription?.trialEnd !== undefined;
  // 現在トライアル中かどうか
  const isTrialing = subscription?.status === "trialing";
  // トライアル残日数
  const trialDaysRemaining = (() => {
    if (!isTrialing || !subscription?.trialEnd) return 0;
    const end = new Date(subscription.trialEnd).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  })();

  // オファリングを取得
  const fetchOfferings = useCallback(async () => {
    setLoadingOfferings(true);
    try {
      const offerings = await getOfferings();
      const current = offerings?.current;
      if (current) {
        setMonthlyPackage(current.monthly ?? null);
        setAnnualPackage(current.annual ?? null);
      }
    } catch (err) {
      console.error("オファリング取得エラー:", err);
    } finally {
      setLoadingOfferings(false);
    }
  }, []);

  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  // 年額プランの割引率を計算
  const annualSavingsPercent = (() => {
    if (!monthlyPackage || !annualPackage) return 0;
    const monthlyAnnualized = monthlyPackage.product.price * 12;
    const annualPrice = annualPackage.product.price;
    if (monthlyAnnualized <= 0) return 0;
    return Math.round(((monthlyAnnualized - annualPrice) / monthlyAnnualized) * 100);
  })();

  // 購入処理
  const handlePurchase = async () => {
    const pkg = selectedPeriod === "monthly" ? monthlyPackage : annualPackage;
    if (!pkg) return;

    setPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      if (info) {
        // 購入成功 → サブスクリプション情報を更新して戻る
        await refreshSubscription();
        Alert.alert("購入完了", "Premium プランへようこそ！", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert("購入エラー", "購入に失敗しました。再度お試しください。");
      console.error("購入エラー:", err);
    } finally {
      setPurchasing(false);
    }
  };

  // リストア処理
  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      await refreshSubscription();
      Alert.alert("リストア完了", "購入情報を復元しました。", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("リストアエラー", "購入情報の復元に失敗しました。");
      console.error("リストアエラー:", err);
    } finally {
      setRestoring(false);
    }
  };

  if (loadingOfferings) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* 閉じるボタン */}
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Feather name="x" size={24} color="#374151" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Feather name="zap" size={40} color="#F59E0B" />
          <Text style={styles.title}>Premium にアップグレード</Text>
          <Text style={styles.subtitle}>スキャン回数無制限・広告なしで快適に</Text>
        </View>

        {/* トライアル中の表示 */}
        {isTrialing && (
          <View style={styles.trialBanner}>
            <Feather name="clock" size={16} color="#059669" />
            <Text style={styles.trialBannerText}>
              トライアル残り {trialDaysRemaining} 日
            </Text>
          </View>
        )}

        {/* 特典一覧 */}
        <View style={styles.benefitsContainer}>
          {[
            "スキャン回数 無制限",
            "広告なし",
            "優先サポート",
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <Feather name="check-circle" size={18} color="#059669" />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* プラン選択 */}
        <View style={styles.plansContainer}>
          {/* 年額プラン */}
          {annualPackage && (
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPeriod === "annual" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPeriod("annual")}
              activeOpacity={0.7}
            >
              <View style={styles.planHeader}>
                <View style={styles.planRadio}>
                  {selectedPeriod === "annual" && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planTitle}>年額プラン</Text>
                    {annualSavingsPercent > 0 && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>
                          {annualSavingsPercent}%お得
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planPrice}>
                    {annualPackage.product.priceString} / 年
                  </Text>
                  <Text style={styles.planSubprice}>
                    月あたり {annualPackage.product.currencyCode}{" "}
                    {(annualPackage.product.price / 12).toFixed(0)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* 月額プラン */}
          {monthlyPackage && (
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPeriod === "monthly" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPeriod("monthly")}
              activeOpacity={0.7}
            >
              <View style={styles.planHeader}>
                <View style={styles.planRadio}>
                  {selectedPeriod === "monthly" && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>月額プラン</Text>
                  <Text style={styles.planPrice}>
                    {monthlyPackage.product.priceString} / 月
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* 購入ボタン */}
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || (!monthlyPackage && !annualPackage)}
        >
          {purchasing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {!hasTrialed ? "7日間無料でお試し" : "Premium を開始する"}
            </Text>
          )}
        </TouchableOpacity>

        {!hasTrialed && (
          <Text style={styles.trialNote}>
            7日間の無料トライアル後、自動的に課金されます。{"\n"}
            いつでもキャンセルできます。
          </Text>
        )}

        {/* リストアボタン */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 6,
  },
  trialBannerText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
  },
  benefitsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  planCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  savingsBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#92400E",
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 2,
  },
  planSubprice: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  purchaseButton: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
  },
  trialNote: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  restoreButton: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  restoreButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
});
