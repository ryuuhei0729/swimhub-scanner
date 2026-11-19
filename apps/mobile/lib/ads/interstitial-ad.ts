import { Platform } from "react-native";
import { getAdModule } from "./ads-sdk";

/** Dynamic require の戻り値用に MobileAd の使用メソッドを定義 */
interface InterstitialAdInstance {
  addAdEventListener(type: string, listener: (payload?: unknown) => void): () => void;
  load(): void;
  show(): Promise<void>;
}

/** 本番の広告ユニット ID（未設定の間はプレースホルダーのまま。下の判定で広告を無効化する） */
const PRODUCTION_AD_UNIT_IDS = {
  ios: "ca-app-pub-4640414097368188/SCANNER_IOS_INTERSTITIAL_UNIT_ID", // TODO: Replace with actual iOS ad unit ID
  android: "ca-app-pub-4640414097368188/SCANNER_ANDROID_INTERSTITIAL_UNIT_ID", // TODO: Replace with actual Android ad unit ID
};

/** `ca-app-pub-<publisher>/<10桁の数字>` 形式の正しい広告ユニット ID か */
export function isValidAdUnitId(id: string): boolean {
  return /^ca-app-pub-\d+\/\d+$/.test(id);
}

export function getInterstitialAdUnitId(): string {
  const mod = getAdModule();
  if (!mod) return "";

  if (__DEV__) {
    return mod.TestIds.INTERSTITIAL;
  }

  return Platform.select({
    ios: PRODUCTION_AD_UNIT_IDS.ios,
    android: PRODUCTION_AD_UNIT_IDS.android,
    default: "",
  }) as string;
}

/**
 * 広告を出せる構成か（ネイティブモジュールがあり、本番では正しい広告ユニット ID が設定済み）。
 * false の場合は同意フォーム (UMP) も出さない（広告を出さないのに同意だけ求めることになるため）。
 */
export function isAdsConfigured(): boolean {
  if (!getAdModule()) return false;
  return __DEV__ || isValidAdUnitId(getInterstitialAdUnitId());
}

/**
 * 読み込み済み広告の有効期限。AdMob のインタースティシャルは読み込みから 1 時間で失効し、
 * 失効後に表示してもインプレッションにならないため、余裕を持って 50 分で読み直す。
 */
export const AD_EXPIRY_MS = 50 * 60 * 1000;

/** 読み込み失敗時の再試行間隔（指数バックオフ）。回数はこの配列の長さまで。 */
export const AD_RETRY_DELAYS_MS = [5_000, 20_000];

export type InterstitialAdState = "idle" | "loading" | "loaded" | "showing" | "closed" | "error";

export interface InterstitialAdController {
  /**
   * 表示可能な広告が無ければ読み込みを開始する。
   * 読み込み中・読み込み済み（未失効）の場合は何もしない（画像の選び直しで無駄なリクエストを出さない）。
   */
  ensureLoaded: () => void;
  /** 今すぐ表示できる（読み込み済みかつ未失効）か */
  isReady: () => boolean;
  /**
   * 広告を表示する。表示できた場合は true。
   * 注意: 返り値の Promise は広告が「画面に出た時点」で解決し、閉じられるのは待たない。
   */
  show: () => Promise<boolean>;
  getState: () => InterstitialAdState;
  dispose: () => void;
}

/**
 * 解析成功後に表示するインタースティシャル広告のコントローラー。
 * ATT (App Tracking Transparency) は導入していないため、常に非パーソナライズ広告のみをリクエストする。
 * 広告を出せない環境（ネイティブモジュール無し・本番の広告ユニット ID 未設定）では null を返す。
 */
export function createInterstitialAdController(
  adUnitId: string = getInterstitialAdUnitId(),
): InterstitialAdController | null {
  const mod = getAdModule();
  if (!mod) return null;

  if (!__DEV__ && !isValidAdUnitId(adUnitId)) {
    console.warn("インタースティシャル広告ユニット ID が未設定のため広告を無効化します:", adUnitId);
    return null;
  }

  const { InterstitialAd, AdEventType } = mod;

  let state: InterstitialAdState = "idle";
  let loadedAt = 0;
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let unsubscribers: (() => void)[] = [];
  let interstitialAd: InterstitialAdInstance | null = null;

  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function teardownAd() {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers = [];
    interstitialAd = null;
  }

  function startLoad() {
    if (disposed) return;
    teardownAd();

    const ad = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    }) as InterstitialAdInstance;
    interstitialAd = ad;

    unsubscribers.push(
      ad.addAdEventListener(AdEventType.LOADED, () => {
        if (interstitialAd !== ad) return;
        state = "loaded";
        loadedAt = Date.now();
        retryCount = 0;
      }),
    );

    unsubscribers.push(
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        if (interstitialAd !== ad) return;
        // 一度表示した広告は再利用できない。次の読み込みは ensureLoaded で必要になった時に行う
        // （無料プランは 1 日 1 回しか解析できないため、閉じた直後の先読みはしない）。
        state = "closed";
      }),
    );

    unsubscribers.push(
      ad.addAdEventListener(AdEventType.ERROR, () => {
        if (interstitialAd !== ad) return;
        // 表示の失敗（iOS の didFailToPresentFullScreenContent 等）は show() の reject ではなく
        // このイベントで届く（show() は表示の呼び出し直後に解決済み）。この広告はもう使えないので
        // 破棄して error にし、次回 ensureLoaded で読み直す。ここで return するだけだと
        // state が "showing" のまま固まり、以後一切読み込まれなくなる。
        if (state === "showing") {
          teardownAd();
          state = "error";
          return;
        }
        state = "error";
        if (retryCount < AD_RETRY_DELAYS_MS.length) {
          const delay = AD_RETRY_DELAYS_MS[retryCount];
          retryCount += 1;
          clearRetryTimer();
          retryTimer = setTimeout(() => {
            retryTimer = null;
            if (state === "error") startLoad();
          }, delay);
        }
      }),
    );

    state = "loading";
    ad.load();
  }

  function isReady() {
    return state === "loaded" && !!interstitialAd && Date.now() - loadedAt < AD_EXPIRY_MS;
  }

  return {
    ensureLoaded() {
      if (disposed) return;
      if (state === "loading" || state === "showing") return;
      if (isReady()) return;
      // 再試行待ちのエラー状態からは、ユーザー操作を契機に即時再読み込みしてよい
      if (state === "error") {
        clearRetryTimer();
      } else {
        retryCount = 0;
      }
      startLoad();
    },

    isReady,

    async show() {
      if (!isReady() || !interstitialAd) return false;
      state = "showing";
      try {
        await interstitialAd.show();
        return true;
      } catch {
        // 表示失敗した広告は使えないので破棄し、次回 ensureLoaded で読み直す
        teardownAd();
        state = "error";
        return false;
      }
    },

    getState() {
      return state;
    },

    dispose() {
      disposed = true;
      clearRetryTimer();
      teardownAd();
      state = "idle";
    },
  };
}
