import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getUserStatus, scanTimesheet, guestScanTimesheet, ApiError } from "@/lib/api-client";
import { canGuestScanToday, recordGuestScan, getGuestTodayCount } from "@/lib/guest-daily-limit";
import { PLAN_LIMITS } from "@swimhub-scanner/shared";
import { useAuth } from "@/contexts/AuthProvider";
import { useScanResultStore } from "@/stores/scanResultStore";
import { shareTimesheetPdf, shareTimesheetImage } from "@/lib/timesheet-print";
import {
  validateImageMimeType,
  validateImageSize,
  estimateBase64Size,
} from "@swimhub-scanner/shared";
import type { UserStatusResponse } from "@swimhub-scanner/shared";
import { ResultTable } from "@/components/scanner/ResultTable";
import { ExportSheet } from "@/components/scanner/ExportSheet";
import {
  createRewardedAdController,
  type AdState,
  type RewardedAdController,
} from "@/lib/ads/rewarded-ad";
import type { MainStackParamList } from "@/navigation/types";

type Step = "idle" | "scanning" | "result";

export const ScannerScreen: React.FC = () => {
  const { isGuest, isAuthenticated, subscription } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [step, setStep] = useState<Step>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null);
  const [guestCanScan, setGuestCanScan] = useState<boolean>(true);
  const [guestTodayCount, setGuestTodayCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templatePreviewVisible, setTemplatePreviewVisible] = useState(false);

  // --- Ad state ---
  const adControllerRef = useRef<RewardedAdController | null>(null);
  const [adState, setAdState] = useState<AdState>("idle");
  const [adUnavailable, setAdUnavailable] = useState(false);
  const scanTriggeredRef = useRef(false);

  const { menu, swimmers, setResult, reset: resetResult } = useScanResultStore();

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      if (isGuest) {
        const canScan = await canGuestScanToday();
        const todayCount = await getGuestTodayCount();
        setGuestCanScan(canScan);
        setGuestTodayCount(todayCount);
        setUserStatus(null);
      } else if (isAuthenticated) {
        const status = await getUserStatus();
        setUserStatus(status);
        setGuestCanScan(true);
        setGuestTodayCount(0);
      } else {
        setUserStatus(null);
        setGuestCanScan(true);
        setGuestTodayCount(0);
      }
    } catch (err) {
      console.error("ステータスの取得に失敗:", err);
    } finally {
      setStatusLoading(false);
    }
  }, [isGuest, isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Preload ad when user selects an image
  useEffect(() => {
    if (!imageBase64) return;

    const controller = createRewardedAdController();
    if (!controller) {
      setAdUnavailable(true);
      return;
    }
    adControllerRef.current = controller;

    const unsubscribe = controller.onStateChange((state) => {
      setAdState(state);
    });

    controller.load();

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [imageBase64]);

  // 広告は解析成功後に startScan 内で表示するため、
  // 自動表示の useEffect は不要

  const pickImage = async (useCamera: boolean) => {
    setError(null);

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    };

    let result: ImagePicker.ImagePickerResult;

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("権限エラー", "カメラへのアクセスが許可されていません");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";

    // バリデーション
    if (!validateImageMimeType(mimeType)) {
      setError("JPEG または PNG 形式の画像を使用してください");
      return;
    }

    if (asset.base64) {
      const size = estimateBase64Size(asset.base64);
      if (!validateImageSize(size)) {
        setError("画像サイズは10MB以下にしてください");
        return;
      }
    }

    setImageUri(asset.uri);
    setImageBase64(asset.base64 || null);
    setImageMimeType(mimeType);
  };

  const startScan = async () => {
    if (!imageBase64) return;

    // 権限チェック: トークン不足の場合はペイウォールに遷移
    if (!canScan) {
      if (isGuest) {
        navigation.navigate("GuestSignup");
      } else if (isAuthenticated) {
        navigation.navigate("Paywall");
      }
      return;
    }

    setStep("scanning");
    setError(null);
    scanTriggeredRef.current = true;

    // --- Start API scan (広告は解析成功後に表示) ---
    try {
      const request = {
        image: imageBase64,
        mimeType: imageMimeType as "image/jpeg" | "image/png",
      };
      const response = isGuest ? await guestScanTimesheet(request) : await scanTimesheet(request);
      // ゲスト: 解析成功時のみ日次利用を記録
      if (isGuest) {
        await recordGuestScan();
      }

      // --- 解析成功: 結果表示前に広告を表示 ---
      const controller = adControllerRef.current;
      if (controller && !adUnavailable) {
        const currentState = controller.getState();
        if (currentState === "loaded") {
          try {
            await controller.show();
          } catch {
            // 広告表示失敗は無視して結果表示へ
          }
        }
      }

      setResult(response);
      setStep("result");
      // 利用状況を再取得
      fetchStatus();
    } catch (err) {
      setStep("idle");
      // ゲストでAPIエラーの場合、消費したトークンは戻さない（不正防止）
      if (err instanceof ApiError) {
        switch (err.code) {
          case "DAILY_LIMIT_EXCEEDED":
          case "TOKEN_EXHAUSTED":
            setError("本日の利用回数上限に達しました。毎日0時（日本時間）にリセットされます。");
            break;
          case "SWIMMER_LIMIT_EXCEEDED":
            setError("1回のスキャンで解析できるのは8名までです");
            break;
          case "PARSE_ERROR":
            setError(
              "画像からタイム情報を読み取れませんでした。鮮明なタイム記録表の画像を使用してください",
            );
            break;
          case "API_ERROR":
            setError(
              "画像の解析に失敗しました。タイム記録表の画像であることを確認し、再度お試しください",
            );
            break;
          case "IMAGE_ERROR":
            setError(err.message);
            break;
          default:
            setError("解析中にエラーが発生しました。再度お試しください");
        }
      } else {
        const isNetworkError = err instanceof TypeError && err.message?.includes("Network");
        setError(
          isNetworkError
            ? "通信エラーが発生しました。ネットワーク接続を確認してください"
            : "解析に失敗しました。再度お試しください",
        );
      }
    }
  };

  const handleReset = () => {
    Alert.alert(
      "解析結果の破棄",
      "現在の解析結果は破棄されます。よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "破棄して解析",
          style: "destructive",
          onPress: () => {
            setStep("idle");
            setImageUri(null);
            setImageBase64(null);
            setError(null);
            resetResult();
            scanTriggeredRef.current = false;
            setAdState("idle");
            setAdUnavailable(false);
            adControllerRef.current?.dispose();
            adControllerRef.current = null;
          },
        },
      ],
    );
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["キャンセル", "写真を撮る", "ライブラリから選ぶ"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
        },
      );
    } else {
      Alert.alert("画像を選択", "", [
        { text: "写真を撮る", onPress: () => pickImage(true) },
        { text: "ライブラリから選ぶ", onPress: () => pickImage(false) },
        { text: "キャンセル", style: "cancel" },
      ]);
    }
  };

  // Premium ユーザーかどうか
  const isPremium =
    subscription?.plan === "premium" &&
    (subscription?.status === "active" || subscription?.status === "trialing");

  // canScan の判定
  const canScan = (() => {
    // Premium（active / trialing）は常にOK
    if (isPremium) return true;
    if (isGuest) {
      return guestCanScan;
    }
    if (userStatus) {
      if (userStatus.tokensRemaining === null) return false;
      return userStatus.tokensRemaining > 0;
    }
    return false;
  })();

  // 表示用の残り回数
  const dailyLimit = PLAN_LIMITS.guest.dailyScanLimit ?? 1;
  const guestRemaining = Math.max(0, dailyLimit - guestTodayCount);
  const displayTokens = (() => {
    if (isPremium) return null; // Premium は無制限
    if (isGuest) return guestRemaining;
    if (userStatus?.tokensRemaining !== undefined) return userStatus.tokensRemaining;
    return null;
  })();

  // Step 2: 解析中
  if (step === "scanning") {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.scanningText}>画像を解析しています...</Text>
          <Text style={styles.scanningSubtext}>しばらくお待ちください</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Step 3: 結果確認
  if (step === "result" && menu && swimmers.length > 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          style={styles.resultContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>メニュー情報</Text>
            <Text style={styles.menuDescription}>{menu.description}</Text>
            <View style={styles.menuDetails}>
              <Text style={styles.menuDetail}>距離: {menu.distance}m</Text>
              <Text style={styles.menuDetail}>本数: {menu.repCount}本</Text>
              <Text style={styles.menuDetail}>セット: {menu.setCount}セット</Text>
              {menu.circle && (
                <Text style={styles.menuDetail}>
                  サークル:{" "}
                  {menu.circle >= 60
                    ? `${Math.floor(menu.circle / 60)}分${menu.circle % 60 > 0 ? `${menu.circle % 60}秒` : ""}`
                    : `${menu.circle}秒`}
                </Text>
              )}
            </View>
          </View>

          <ResultTable />

          <ExportSheet />

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>新しい画像を解析する</Text>
          </TouchableOpacity>

          {isGuest && (
            <TouchableOpacity
              style={styles.signupPromptButton}
              onPress={() => navigation.navigate("GuestSignup")}
            >
              <Text style={styles.signupPromptText}>アカウント登録してもっと使う</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const steps = ["スキャン", "解析", "確認"];

  // Step 1: 画像選択
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.idleContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require("../assets/icon.png")} style={styles.appIcon} />
          <Text style={styles.title}>SwimHub</Text>
          <Text style={styles.subtitle}>タイム記録表をAIで瞬時にデータ化</Text>

          {/* Auth action bar */}
          {isAuthenticated ? (
            <Pressable
              style={styles.accountChip}
              onPress={() => navigation.navigate("Account")}
            >
              <Ionicons name="person-circle" size={18} color="#2563EB" />
              <Text style={styles.accountChipText}>アカウント</Text>
            </Pressable>
          ) : (
            <View style={styles.guestBar}>
              <Text style={styles.guestLabel}>ゲスト利用中</Text>
              <Pressable
                style={styles.loginChip}
                onPress={() => navigation.navigate("LoginMethod")}
              >
                <Text style={styles.loginChipText}>ログイン</Text>
                <Ionicons name="arrow-forward" size={14} color="#ffffff" />
              </Pressable>
            </View>
          )}
        </View>

        {/* Main card */}
        <View style={styles.card}>
          {/* Status badge */}
          {!statusLoading && (
            <View style={styles.statusBar}>
              {isPremium ? (
                <View style={styles.premiumBadge}>
                  <Feather name="zap" size={14} color="#F59E0B" />
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              ) : isGuest ? (
                <Text style={styles.statusText}>残り {guestRemaining}回（今日）</Text>
              ) : userStatus && displayTokens !== null ? (
                <Text style={styles.statusText}>残り {displayTokens}回</Text>
              ) : null}
            </View>
          )}

          {imageUri ? (
            <>
              <TouchableOpacity
                style={styles.previewContainer}
                onPress={showImagePickerOptions}
                activeOpacity={0.8}
              >
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setImageUri(null);
                    setImageBase64(null);
                  }}
                >
                  <Feather name="x" size={16} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.changeImageHint}>
                  <Feather name="refresh-cw" size={14} color="#ffffff" />
                  <Text style={styles.changeImageHintText}>タップで変更</Text>
                </View>
              </TouchableOpacity>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  !canScan && styles.buttonDisabled,
                ]}
                onPress={startScan}
                disabled={!canScan}
              >
                <Text style={styles.primaryButtonText}>解析する</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Feather name="camera" size={26} color="#6B7280" />
              </View>
              <Text style={styles.cardTitle}>画像を選択</Text>
              <Text style={styles.cardDescription}>
                タイム記録表の写真を撮影、{"\n"}またはライブラリから選択してください
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={showImagePickerOptions}
              >
                <Text style={styles.primaryButtonText}>画像を選択</Text>
              </Pressable>
            </>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Limit warning */}
          {!canScan && (
            <Pressable
              style={styles.limitBanner}
              onPress={() => {
                if (isGuest) {
                  navigation.navigate("GuestSignup");
                } else {
                  navigation.navigate("Paywall");
                }
              }}
            >
              <Text style={styles.limitBannerText}>
                {isGuest
                  ? "本日の利用回数上限に達しました。毎日0時（日本時間）にリセットされます。"
                  : "本日の利用回数上限に達しました。毎日0時（日本時間）にリセットされます。"}
              </Text>
              <Text style={styles.limitBannerLink}>
                {isGuest ? "アカウント登録してもっと使う →" : "Premium にアップグレード →"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Step guide */}
        <View style={styles.steps}>
          {steps.map((label, i) => (
            <View key={label} style={styles.stepRow}>
              <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                <Text style={[styles.stepNumber, i === 0 && styles.stepNumberActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Template buttons */}
        <View style={styles.templateSection}>
          <Text style={styles.templateLabel}>記録表テンプレート</Text>
          <View style={styles.templateButtonRow}>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={shareTimesheetPdf}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={16} color="#2563EB" />
              <Text style={styles.templateButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => setTemplatePreviewVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="image" size={16} color="#2563EB" />
              <Text style={styles.templateButtonText}>画像</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* テンプレート画像プレビューモーダル */}
      <Modal
        visible={templatePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplatePreviewVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTemplatePreviewVisible(false)}
        >
          <SafeAreaView style={styles.modalContent} pointerEvents="box-none">
            <View style={styles.modalImageContainer}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <Image
                  source={require("../assets/timesheet-template.png")}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setTemplatePreviewVisible(false)}
              >
                <Feather name="x" size={44} color="#ffffff" />
                <Text style={styles.modalCloseText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalShareButton} onPress={shareTimesheetImage}>
                <Feather name="download" size={44} color="#ffffff" />
                <Text style={styles.modalShareText}>保存</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  // Step 1: Idle
  idleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
    width: "100%",
  },
  appIcon: {
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  guestBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  guestLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  loginChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  loginChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cardDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  statusBar: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#1E40AF",
    textAlign: "center",
    fontWeight: "500",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#92400E",
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 10,
    width: "100%",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    textAlign: "center",
  },
  previewContainer: {
    position: "relative",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  previewImage: {
    width: "100%",
    height: 200,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  changeImageHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  changeImageHintText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  limitBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 6,
    padding: 8,
    width: "100%",
  },
  limitBannerText: {
    fontSize: 10,
    color: "#92400E",
    lineHeight: 16,
  },
  limitBannerLink: {
    fontSize: 10,
    color: "#D97706",
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
    textDecorationLine: "underline",
  },
  steps: {
    marginTop: 40,
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "rgba(37,99,235,0.1)",
    borderColor: "rgba(37,99,235,0.2)",
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
  },
  stepNumberActive: {
    color: "#2563EB",
  },
  stepLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  stepLabelActive: {
    color: "#111827",
    fontWeight: "600",
  },
  templateSection: {
    marginTop: 24,
    alignItems: "center",
    width: "100%",
  },
  templateLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  templateButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#ffffff",
    gap: 4,
  },
  templateButtonText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  signupPromptButton: {
    marginTop: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  signupPromptText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  // Step 2: Scanning
  scanningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanningText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  scanningSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  // Step 3: Result
  resultContainer: {
    flex: 1,
    padding: 16,
  },
  menuInfo: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  menuDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  menuDetail: {
    fontSize: 13,
    color: "#6B7280",
    backgroundColor: "#DBEAFE",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  resetButton: {
    backgroundColor: "#F3F4F6",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  resetButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    flex: 1,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalImage: {
    width: Dimensions.get("window").width - 32,
    height: Dimensions.get("window").height * 0.7,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 64,
    paddingBottom: 24,
    paddingTop: 12,
  },
  modalShareButton: {
    alignItems: "center",
    gap: 6,
  },
  modalShareText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCloseButton: {
    alignItems: "center",
    gap: 6,
  },
  modalCloseText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
