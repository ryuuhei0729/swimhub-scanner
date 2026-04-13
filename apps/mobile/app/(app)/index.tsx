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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserStatus, scanTimesheet, guestScanTimesheet, ApiError } from "@/lib/api-client";
import { canGuestScanToday, recordGuestScan, getGuestTodayCount } from "@/lib/guest-daily-limit";
import { PLAN_LIMITS, checkIsPremium } from "@swimhub-scanner/shared";
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
import { UsageIndicator } from "@/components/plan/UsageIndicator";

const ONBOARDING_SEEN_KEY = "swimhub_scanner_onboarding_seen";

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
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Pinch zoom state for template preview modal ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // --- Ad state ---
  const adControllerRef = useRef<RewardedAdController | null>(null);
  const [_adState, setAdState] = useState<AdState>("idle");
  const [adUnavailable, setAdUnavailable] = useState(false);
  const scanTriggeredRef = useRef(false);

  const { menu, swimmers, setResult, reset: resetResult } = useScanResultStore();

  // Premium ユーザーかどうか（広告制御で使うため早めに定義）
  const isPremium = checkIsPremium(subscription);

  // Onboarding: check if first-time user
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((value) => {
        if (value === null) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        // AsyncStorage failure is non-critical — skip onboarding
      });
  }, []);

  const dismissOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      // Best-effort persistence — onboarding may show again next launch
    }
  }, []);

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

  // Reset zoom when modal closes (JS thread)
  useEffect(() => {
    if (!templatePreviewVisible) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [templatePreviewVisible, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      "worklet";
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      "worklet";
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      "worklet";
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      "worklet";
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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

  // Step 1 step flow data
  const stepFlow: Array<{ icon: React.ComponentProps<typeof Feather>["name"]; label: string }> = [
    { icon: "camera", label: t("scanner.step1Short") },
    { icon: "cpu", label: t("scanner.step2Short") },
    { icon: "download-cloud", label: t("scanner.step3Short") },
  ];

  // Step 1: 画像選択
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.idleScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Top bar: auth chip */}
        <View style={styles.topBar}>
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

        {/* Hero message */}
        <View style={styles.heroSection}>
          <Text style={styles.heroMessage}>{t("scanner.heroMessage")}</Text>
        </View>

        {/* Visual step flow */}
        <View style={styles.stepFlow}>
          {stepFlow.map((item, i) => (
            <React.Fragment key={item.label}>
              <View style={styles.stepCard}>
                <View style={styles.stepCardIcon}>
                  <Feather name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.stepCardLabel}>{item.label}</Text>
              </View>
              {i < stepFlow.length - 1 && (
                <Feather name="arrow-right" size={14} color={colors.mutedLight} style={styles.stepArrow} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Main CTA card */}
        <View style={styles.ctaCard}>
          {/* Usage indicator inside card */}
          {!statusLoading && (
            <UsageIndicator
              plan={isPremium ? "premium" : isGuest ? "guest" : "free"}
              remaining={displayTokens}
              dailyLimit={isPremium ? null : (PLAN_LIMITS[isGuest ? "guest" : "free"].dailyScanLimit ?? 1)}
              onUpsellPress={() => {
                if (isGuest) {
                  router.push("/(app)/guest-signup");
                } else {
                  router.push("/(app)/paywall");
                }
              }}
            />
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
            <Pressable
              style={({ pressed }) => [
                styles.ctaTouchTarget,
                pressed && styles.ctaTouchTargetPressed,
              ]}
              onPress={showImagePickerOptions}
            >
              <View style={styles.ctaIconCircle}>
                <Feather name="camera" size={36} color={colors.primary} />
              </View>
              <Text style={styles.ctaTitle}>{t("scanner.selectImage")}</Text>
              <Text style={styles.ctaDescription}>{t("scanner.selectImageDesc")}</Text>
            </Pressable>
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

        {/* Guest hint below card */}
        {!isAuthenticated && (
          <View style={styles.guestHintRow}>
            <Text style={styles.guestHintText}>{t("scanner.guestLimitHint")}</Text>
            <Text style={styles.guestHintSub}>{t("scanner.registerUnlockHint")}</Text>
          </View>
        )}

        {/* Collapsible template section */}
        <View style={styles.templateSection}>
          <Pressable
            style={({ pressed }) => [
              styles.templateToggleRow,
              pressed && styles.templateTogglePressed,
            ]}
            onPress={() => setTemplateSectionOpen((v) => !v)}
          >
            <Feather
              name={templateSectionOpen ? "chevron-down" : "chevron-right"}
              size={14}
              color={colors.muted}
            />
            <Text style={styles.templateToggleText}>{t("scanner.templateToggle")}</Text>
          </Pressable>

          {templateSectionOpen && (
            <View style={styles.templateButtonRow}>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={shareTimesheetPdf}
                activeOpacity={0.7}
              >
                <Feather name="file-text" size={14} color={colors.primary} />
                <Text style={styles.templateButtonText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={() => setTemplatePreviewVisible(true)}
                activeOpacity={0.7}
              >
                <Feather name="image" size={14} color={colors.primary} />
                <Text style={styles.templateButtonText}>画像</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

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
              <GestureDetector gesture={composedGesture}>
                <Animated.Image
                  source={require("../../assets/timesheet-template.png")}
                  style={[styles.modalImage, animatedImageStyle]}
                  resizeMode="contain"
                />
              </GestureDetector>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setTemplatePreviewVisible(false)}
              >
                <Text style={styles.modalCloseText}>{t("common.close")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={shareTimesheetImage}>
                <Text style={styles.modalSaveText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>

      {/* First-time onboarding overlay */}
      {showOnboarding && (
        <Pressable style={styles.onboardingOverlay} onPress={dismissOnboarding}>
          <View style={styles.onboardingContent}>
            <View style={styles.onboardingArrow} />
            <Text style={styles.onboardingText}>{t("scanner.onboardingHint")}</Text>
            <Text style={styles.onboardingDismiss}>{t("common.close")}</Text>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Step 1: Idle - scroll wrapper
  idleScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: radius.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
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
    gap: spacing.sm,
  },
  guestLabel: {
    fontSize: fontSize.sm,
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
  // Hero message
  heroSection: {
    marginBottom: spacing.xl,
  },
  heroMessage: {
    fontSize: fontSize["3xl"],
    fontWeight: "800",
    color: colors.text,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  // Visual step flow
  stepFlow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  stepCard: {
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  stepCardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCardLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  stepArrow: {
    marginBottom: 20,
  },
  // Main CTA card
  ctaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: spacing.md,
  },
  ctaTouchTarget: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    borderStyle: "dashed",
    borderRadius: radius.xl,
  },
  ctaTouchTargetPressed: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  ctaIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
  },
  ctaDescription: {
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
  // Guest hint row
  guestHintRow: {
    alignItems: "center",
    gap: 2,
    marginBottom: spacing.md,
  },
  guestHintText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: "center",
  },
  guestHintSub: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: "500",
  },
  // Collapsible template section
  templateSection: {
    alignItems: "flex-start",
    width: "100%",
  },
  templateToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  templateTogglePressed: {
    opacity: 0.7,
  },
  templateToggleText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    fontWeight: "500",
  },
  templateButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
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
    overflow: "hidden",
  },
  modalImage: {
    width: Dimensions.get("window").width - spacing.xxl,
    height: Dimensions.get("window").height * 0.7,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  modalSaveText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  modalCloseText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  // Onboarding overlay
  onboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  onboardingContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    maxWidth: 320,
    width: "100%",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  onboardingArrow: {
    width: 48,
    height: 48,
    borderRadius: radius.xxl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingText: {
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  onboardingDismiss: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
