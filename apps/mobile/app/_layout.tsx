import "../lib/i18n";
import { useEffect, useRef, useCallback } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import * as Font from "expo-font";
import { ChakraPetch_700Bold } from "@expo-google-fonts/chakra-petch";
import { AuthProvider, useAuth } from "../contexts/AuthProvider";
import { supabase } from "../lib/supabase";
import { extractDeepLinkError, extractTokenHash } from "../lib/auth-deep-link";
import { claimOAuthCode } from "../lib/google-auth";
import { colors, fontSize } from "../theme";

// ChakraPetch_700Bold is preloaded for the brand wordmark (see MEMORY: brand font unification).
// Best-effort: failures fall back to the system font.
Font.loadAsync({ ChakraPetch_700Bold }).catch(() => {});

/**
 * Supabase未初期化時のエラー画面
 */
function SupabaseErrorScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{t("settings.configError")}</Text>
      <Text style={styles.errorMessage}>{t("settings.configErrorMessage")}</Text>
    </View>
  );
}

/**
 * 認証状態に応じてルーティングをガード
 * 初回起動時は get-started 画面に誘導し、ユーザーがゲスト利用を選んだ場合のみゲストモードに入る
 * （スキャン機能はアカウント不要なので、get-started にゲスト利用ボタンを用意する）
 */
function AuthGate() {
  const {
    user,
    isAuthenticated,
    isGuest,
    loading,
    transitioning,
    pendingRecoveryCheck,
    setPendingRecoveryCheck,
  } = useAuth();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();
  const redirectDone = useRef(false);
  const prevAuthStateRef = useRef({ user: !!user, isGuest });
  const prevSegmentsRef = useRef<string | undefined>(segments[0]);
  // 同一 code を重複処理しない（getInitialURL が `t` 等の依存変化で再実行された場合や、
  // addEventListener と getInitialURL の両方から同じ URL が渡された場合の二重交換を防ぐ）
  const processedCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading || transitioning) return;

    const prevUser = prevAuthStateRef.current.user;
    const prevIsGuest = prevAuthStateRef.current.isGuest;
    if (prevUser !== !!user || prevIsGuest !== isGuest) {
      redirectDone.current = false;
      prevAuthStateRef.current = { user: !!user, isGuest };
    }

    // ルートグループが変わったら再評価する (deep-link や手動遷移をガード)
    if (prevSegmentsRef.current !== segments[0]) {
      redirectDone.current = false;
      prevSegmentsRef.current = segments[0];
    }

    if (redirectDone.current) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !isGuest && !inAuthGroup) {
      redirectDone.current = true;
      router.replace("/(auth)/get-started");
    } else if (!!user && inAuthGroup && !pendingRecoveryCheck) {
      redirectDone.current = true;
      router.replace("/(app)");
    }
  }, [
    user,
    isAuthenticated,
    isGuest,
    loading,
    transitioning,
    pendingRecoveryCheck,
    segments,
    router,
  ]);

  // メール確認・パスワードリセット・Google OAuth など、Supabase/OAuth プロバイダから
  // 戻ってくる deep link を処理する。
  // Supabase メールテンプレートが `?token_hash=...&type=...` 形式になったため、
  // まずこれを検出して verifyOtp でセッションを確立する。見つからない場合は
  // 後方互換として PKCE の `code` パラメータを検出し exchangeCodeForSession を使う
  // (onAuthStateChange 経由で AuthProvider に自動反映される)。
  //
  // 種別は URL のパスマーカーで判別する（旧実装は exchangeCodeForSession の戻り値の
  // `redirectType` に依存していたが、公開の型定義に無いランタイム専用フィールドの
  // cast 読み取りであり supabase-js の更新で壊れうるため廃止）:
  //   - `swimhub-scanner://auth/callback` … Google OAuth のコールバック。
  //     通常は useGoogleAuth 側の WebBrowser.openAuthSessionAsync が直接処理する
  //     ため、ここでは何もしない。ただしこのグローバルハンドラは同じ URL の
  //     安全網でもある: Android で Custom Tabs 復帰が新規 Intent になった場合や、
  //     ブラウザ表示中にアプリプロセスが kill されコールドスタートした場合、
  //     openAuthSessionAsync が URL を返さずに解決してしまい useGoogleAuth 側の
  //     処理が発火しないことがある。この安全網が無いとサインインが無症状に
  //     失敗し、ユーザーに復旧手段が無くなる。同一 code が両経路 (useGoogleAuth
  //     と本ハンドラ) に届いても、共有パッケージの claimOAuthCode が「最初に
  //     処理した側だけが交換する」ことを保証するため、二重交換は起きない
  //     (詳細は claimOAuthCode.ts のコメント参照)。
  //   - `swimhub-scanner://reset-password` … パスワードリセット (recovery)。
  //     token_hash 形式の場合は type=recovery でも判別できる
  //   - それ以外（`swimhub-scanner://` 単体など）… メール確認 (signUp) 由来
  const handleAuthDeepLink = useCallback(
    async (url: string | null, isColdStart: boolean = false) => {
      if (!url || !supabase) return;

      // expo-linking の parse は独自スキームを authority ベースで解釈するため、
      // `scheme://auth/callback` は hostname:"auth" / path:"callback" に、
      // `scheme://reset-password` は hostname:"reset-password" / path:null になる。
      const { hostname, path, queryParams } = Linking.parse(url);

      // Google OAuth コールバックは通常 useGoogleAuth 側が処理するため、
      // エラー情報（キャンセル時の error=access_denied 等）はここでは無視する
      // （エラー Alert の重複・誤表示防止）。エラー抽出より先に判定すること。
      const isOAuthCallback = hostname === "auth" && path === "callback";
      if (isOAuthCallback) {
        const code = queryParams?.code;
        if (typeof code !== "string" || code.length === 0) return;

        // useGoogleAuth (warm path) が既にこの code を claim 済みなら claimed:false
        // になる。その場合は「他所が処理中/処理済み」なのでここでは何もしない
        // （二重交換・二重エラー表示の防止）。
        const claim = claimOAuthCode(code);
        if (!claim.claimed) return;

        // claim に勝った = warm path が既に諦めた後にこの安全網だけが code を
        // 見ている、という状況。session の有無まで確認する (error が無くても
        // session が無いケースを失敗として扱わないと、claim の勝敗で挙動が
        // 非対称になる)。
        //
        // 失敗時の通知は isColdStart (このハンドラが getInitialURL 経由=アプリ
        // 起動時に呼ばれたか) で分岐する:
        //   - warm (addEventListener 経由): useGoogleAuth の JS コンテキストが
        //     生きており、warm path 側が既にエラー表示済みのはずなので通知しない
        //     (通知すると宛先を失ったエラー表示が二重に出てしまう)。
        //   - cold start (getInitialURL 経由): ブラウザ表示中にアプリが kill
        //     されていた場合、warm path の JS コンテキストごと失われている。
        //     無言で失敗するとユーザーは理由も分からずログイン画面に取り残される
        //     ため、token_hash 経路と同じ方法で通知する。
        // 失敗時も必ず claim.resolve を呼ぶこと（呼ばないと、この code の結果を
        // 待っている負けた側が永久にハングする）。
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            claim.resolve({ success: false });
            if (isColdStart) {
              Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
            }
            return;
          }
          claim.resolve({ success: true });
        } catch {
          claim.resolve({ success: false });
          if (isColdStart) {
            Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
          }
        }
        return;
      }

      const deepLinkError = extractDeepLinkError(url);
      if (deepLinkError) {
        console.error("認証リンクにエラーが含まれています:", deepLinkError);
        Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
        return;
      }

      // 新形式: Supabase メールテンプレートの token_hash + type
      // (code より先にチェックし、両方揃う場合は token_hash を優先する)
      const tokenHashResult = extractTokenHash(url);
      if (tokenHashResult) {
        const { tokenHash, type } = tokenHashResult;
        if (processedCodesRef.current.has(tokenHash)) return;
        processedCodesRef.current.add(tokenHash);

        const isRecovery = type === "recovery" || hostname === "reset-password";
        if (isRecovery) {
          setPendingRecoveryCheck(true);
        }

        try {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          if (error) {
            console.error("認証リンクのセッション確立に失敗:", error);
            if (isRecovery) setPendingRecoveryCheck(false);
            Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
            return;
          }

          if (isRecovery) {
            router.replace("/(auth)/reset-password");
          }
        } catch (err) {
          console.error("認証リンクのセッション確立で例外が発生:", err);
          if (isRecovery) setPendingRecoveryCheck(false);
          Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
        }
        return;
      }

      const code = queryParams?.code;
      if (typeof code !== "string" || code.length === 0) return;

      // 同一 code の二重交換を防ぐ（getInitialURL の再実行や複数リスナーからの重複呼び出し対策）
      if (processedCodesRef.current.has(code)) return;
      processedCodesRef.current.add(code);

      const isRecovery = hostname === "reset-password";
      if (isRecovery) {
        // AuthGate の「ログイン済みなら (app) へ」自動遷移を抑止しておく
        // （実行順序に依存しないよう、await の前に同期的にセットする）。
        setPendingRecoveryCheck(true);
      }

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("認証リンクのセッション確立に失敗:", error);
          if (isRecovery) setPendingRecoveryCheck(false);
          Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
          return;
        }

        if (isRecovery) {
          router.replace("/(auth)/reset-password");
        }
      } catch (err) {
        console.error("認証リンクのセッション確立で例外が発生:", err);
        if (isRecovery) setPendingRecoveryCheck(false);
        Alert.alert(t("common.error"), t("auth.errors.deepLinkFailed"));
      }
    },
    [router, t, setPendingRecoveryCheck],
  );

  // メール確認リンクなどで、アプリが起動していない状態から開かれた場合 (cold start)。
  // isColdStart=true を渡し、OAuth コールバック安全網が失敗時にユーザーへ通知できるようにする
  // (warm path の JS コンテキストが存在しないため)。
  useEffect(() => {
    Linking.getInitialURL().then((url) => handleAuthDeepLink(url, true));
  }, [handleAuthDeepLink]);

  // アプリがバックグラウンド/フォアグラウンドの状態で deep link を受け取った場合 (warm)。
  // isColdStart=false (既定) のままにし、warm path 側の既存のエラー表示との二重通知を防ぐ。
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleAuthDeepLink(url);
    });
    return () => subscription.remove();
  }, [handleAuthDeepLink]);

  if (!supabase) {
    return <SupabaseErrorScreen />;
  }

  if (loading || transitioning) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    try {
      const mobileAds = require("react-native-google-mobile-ads").default;
      mobileAds().initialize();
    } catch {
      // Ad module not available (e.g., running in Expo Go)
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: "#374151",
    textAlign: "center",
    lineHeight: 24,
  },
});
