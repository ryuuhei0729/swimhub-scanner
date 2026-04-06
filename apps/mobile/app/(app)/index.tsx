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
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import { colors, spacing, radius, fontSize } from "@/theme";

type Step = "idle" | "scanning" | "result";

export default function ScannerScreen() {
  const { t } = useTranslation();
  const { user, isGuest, isAuthenticated, subscription } = useAuth();
  const router = useRouter();

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
  const [_adState, setAdState] = useState<AdState>("idle");
  const [adUnavailable, setAdUnavailable] = useState(false);
  const scanTriggeredRef = useRef(false);

  const { menu, swimmers, setResult, reset: resetResult } = useScanResultStore();

  // Premium ユーザーかどうか（広告制御で使うため早めに定義）
  const isPremium =
    subscription?.plan === "premium" &&
    (subscription?.status === "active" || subscription?.status === "trialing");

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

  // Preload ad when user selects an image (premium users skip ads)
  useEffect(() => {
    if (!imageBase64 || isPremium) return;

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
  }, [imageBase64, isPremium]);

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
        Alert.alert(t("scanner.cameraPermissionTitle"), t("scanner.cameraPermissionError"));
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
      setError(t("uploader.invalidFormat"));
      return;
    }

    if (asset.base64) {
      const size = estimateBase64Size(asset.base64);
      if (!validateImageSize(size)) {
        setError(t("uploader.tooLarge"));
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
        router.push("/(app)/guest-signup");
      } else if (isAuthenticated) {
        router.push("/(app)/paywall");
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

      // --- 解析成功: 結果表示前に広告を表示（premium は広告なし） ---
      if (!isPremium) {
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
            setError(t("scanner.dailyLimitReached"));
            break;
          case "SWIMMER_LIMIT_EXCEEDED":
            setError(t("scanner.swimmerLimitScan"));
            break;
          case "PARSE_ERROR":
            setError(t("scanner.parseError"));
            break;
          case "API_ERROR":
            setError(t("scanner.apiError"));
            break;
          case "IMAGE_ERROR":
            setError(err.message);
            break;
          default:
            setError(t("scanner.scanError"));
        }
      } else {
        const isNetworkError = err instanceof TypeError && err.message?.includes("Network");
        setError(
          isNetworkError
            ? t("scanner.networkError")
            : t("scanner.scanFailed"),
        );
      }
    }
  };

  const handleReset = () => {
    Alert.alert(
      t("scanner.discardTitle"),
      t("scanner.discardMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("scanner.discardConfirm"),
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
          options: [t("common.cancel"), t("scanner.takePhoto"), t("scanner.chooseFromLibrary")],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
        },
      );
    } else {
      Alert.alert(t("scanner.selectImage"), "", [
        { text: t("scanner.takePhoto"), onPress: () => pickImage(true) },
        { text: t("scanner.chooseFromLibrary"), onPress: () => pickImage(false) },
        { text: t("common.cancel"), style: "cancel" },
      ]);
    }
  };

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
      <SafeAreaView style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultHeaderTitle}>{t("scanner.scanningHeader")}</Text>
        </View>
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.scanningText}>{t("scanner.scanning")}</Text>
          <Text style={styles.scanningSubtext}>{t("scanner.scanningWait")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Step 3: 結果確認
  if (step === "result" && menu && swimmers.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultHeaderTitle}>{t("scanner.resultHeader")}</Text>
        </View>
        <ScrollView
          style={styles.resultContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>{t("scanner.menuInfo")}</Text>
            <Text style={styles.menuDescription}>{menu.description}</Text>
            <View style={styles.menuDetails}>
              <Text style={styles.menuDetail}>{t("result.distance")}: {menu.distance}m</Text>
              <Text style={styles.menuDetail}>{t("result.repCount")}: {menu.repCount}{t("result.repShort")}</Text>
              <Text style={styles.menuDetail}>{t("result.setCount")}: {menu.setCount}{t("result.set")}</Text>
              {menu.circle && (
                <Text style={styles.menuDetail}>
                  {t("result.circle")}:{" "}
                  {menu.circle >= 60
                    ? t("result.circleMinutesSeconds", { minutes: Math.floor(menu.circle / 60), seconds: menu.circle % 60 > 0 ? menu.circle % 60 : undefined }).replace(/ $/, "")
                    : t("result.circleSeconds", { seconds: menu.circle })}
                </Text>
              )}
            </View>
          </View>

          <ResultTable />

          <ExportSheet />

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>{t("scanner.newScanReset")}</Text>
          </TouchableOpacity>

          {isGuest && (
            <TouchableOpacity
              style={styles.signupPromptButton}
              onPress={() => router.push("/(app)/guest-signup")}
            >
              <Text style={styles.signupPromptText}>{t("scanner.registerForMore")}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const steps = [t("scanner.step1"), t("scanner.step2"), t("scanner.step3")];

  // Step 1: 画像選択
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.idleContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("scanner.heroTitle")}</Text>
          <Text style={styles.subtitle}>{t("scanner.subtitle")}</Text>

          {/* Auth action bar */}
          {isAuthenticated ? (
            <Pressable
              style={styles.accountChip}
              onPress={() => router.push("/(app)/account")}
            >
              <Ionicons name="person-circle" size={18} color={colors.primary} />
              <Text style={styles.accountChipText} numberOfLines={1}>
                {user?.user_metadata?.name || user?.email || t("scanner.account")}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.guestBar}>
              <Text style={styles.guestLabel}>{t("scanner.guestMode")}</Text>
              <Pressable
                style={styles.loginChip}
                onPress={() => router.push("/(app)/login-method")}
              >
                <Text style={styles.loginChipText}>{t("common.login")}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.white} />
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
                  <Feather name="zap" size={14} color={colors.warningIcon} />
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              ) : isGuest ? (
                <Text style={styles.statusText}>{t("scanner.remainingCount", { count: guestRemaining })}</Text>
              ) : userStatus && displayTokens !== null ? (
                <Text style={styles.statusText}>{t("scanner.remainingCountShort", { count: displayTokens })}</Text>
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
                  <Feather name="x" size={16} color={colors.white} />
                </TouchableOpacity>
                <View style={styles.changeImageHint}>
                  <Feather name="refresh-cw" size={14} color={colors.white} />
                  <Text style={styles.changeImageHintText}>{t("scanner.changeImageHint")}</Text>
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
                <Text style={styles.primaryButtonText}>{t("scanner.scan")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Feather name="camera" size={26} color={colors.muted} />
              </View>
              <Text style={styles.cardTitle}>{t("scanner.selectImage")}</Text>
              <Text style={styles.cardDescription}>
                {t("scanner.selectImageDesc")}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={showImagePickerOptions}
              >
                <Text style={styles.primaryButtonText}>{t("scanner.selectImage")}</Text>
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
                  router.push("/(app)/guest-signup");
                } else {
                  router.push("/(app)/paywall");
                }
              }}
            >
              <Text style={styles.limitBannerText}>
                {t("scanner.dailyLimitReached")}
              </Text>
              <Text style={styles.limitBannerLink}>
                {isGuest ? t("scanner.dailyLimitRegisterLink") : t("scanner.dailyLimitUpgradeLink")}
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
          <Text style={styles.templateLabel}>{t("scanner.templateLabel")}</Text>
          <View style={styles.templateButtonRow}>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={shareTimesheetPdf}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={16} color={colors.primary} />
              <Text style={styles.templateButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => setTemplatePreviewVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="image" size={16} color={colors.primary} />
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
                  source={require("../../assets/timesheet-template.png")}
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
                <Feather name="x" size={44} color={colors.white} />
                <Text style={styles.modalCloseText}>{t("common.close")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalShareButton} onPress={shareTimesheetImage}>
                <Feather name="download" size={44} color={colors.white} />
                <Text style={styles.modalShareText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Step 1: Idle
  idleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
    width: "100%",
  },
  title: {
    fontSize: fontSize["4xl"],
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: radius.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  accountChipText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.primary,
    flexShrink: 1,
  },
  guestBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.lg,
  },
  guestLabel: {
    fontSize: 13,
    color: colors.mutedLight,
    fontWeight: "500",
  },
  loginChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  loginChipText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.white,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
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
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  statusBar: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.primaryDeep,
    textAlign: "center",
    fontWeight: "500",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  premiumBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: "bold",
    color: colors.amber,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderRadius: radius.md,
    padding: 10,
    width: "100%",
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  previewContainer: {
    position: "relative",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    overflow: "hidden",
    width: "100%",
  },
  previewImage: {
    width: "100%",
    height: 200,
  },
  removeImageButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  changeImageHint: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  changeImageHintText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  limitBanner: {
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.sm,
    padding: spacing.sm,
    width: "100%",
  },
  limitBannerText: {
    fontSize: fontSize.xs,
    color: colors.amber,
    lineHeight: 16,
  },
  limitBannerLink: {
    fontSize: fontSize.xs,
    color: colors.warningText,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: spacing.xs,
    textDecorationLine: "underline",
  },
  steps: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    gap: spacing.xl,
  },
  stepRow: {
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryMutedBorder,
  },
  stepNumber: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.muted,
  },
  stepNumberActive: {
    color: colors.primary,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: "600",
  },
  templateSection: {
    marginTop: spacing.xl,
    alignItems: "center",
    width: "100%",
  },
  templateLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  templateButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  templateButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  signupPromptButton: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  signupPromptText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  // Result header
  resultHeader: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  resultHeaderTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: colors.text,
  },
  // Step 2: Scanning
  scanningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanningText: {
    marginTop: spacing.lg,
    fontSize: fontSize.xxl,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  scanningSubtext: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.muted,
  },
  // Step 3: Result
  resultContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  menuInfo: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  menuTitle: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.primaryDarkest,
    marginBottom: spacing.xs,
  },
  menuDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  menuDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  menuDetail: {
    fontSize: 13,
    color: colors.muted,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  resetButton: {
    backgroundColor: colors.surfaceRaised,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
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
    padding: spacing.lg,
  },
  modalImage: {
    width: Dimensions.get("window").width - spacing.xxl,
    height: Dimensions.get("window").height * 0.7,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 64,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  modalShareButton: {
    alignItems: "center",
    gap: 6,
  },
  modalShareText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  modalCloseButton: {
    alignItems: "center",
    gap: 6,
  },
  modalCloseText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
