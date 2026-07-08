import { Platform } from "react-native";

/** Dynamic require の戻り値用に MobileAd の使用メソッドを定義 */
interface InterstitialAdInstance {
  addAdEventListener(type: string, listener: () => void): () => void;
  load(): void;
  show(): Promise<void>;
}

function getAdModule() {
  try {
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

function getInterstitialAdUnitId(): string {
  const mod = getAdModule();
  if (!mod) return "";

  if (__DEV__) {
    return mod.TestIds.INTERSTITIAL;
  }

  return Platform.select({
    ios: "ca-app-pub-4640414097368188/SCANNER_IOS_INTERSTITIAL_UNIT_ID", // TODO: Replace with actual iOS ad unit ID
    android: "ca-app-pub-4640414097368188/SCANNER_ANDROID_INTERSTITIAL_UNIT_ID", // TODO: Replace with actual Android ad unit ID
    default: "",
  }) as string;
}

export type InterstitialAdState = "idle" | "loading" | "loaded" | "showing" | "closed" | "error";

export interface InterstitialAdController {
  load: () => void;
  show: () => Promise<void>;
  getState: () => InterstitialAdState;
  dispose: () => void;
}

/**
 * 解析成功後に表示するインタースティシャル広告のコントローラー。
 * ATT (expo-tracking-transparency) 未導入のため、常に非パーソナライズ広告のみをリクエストする。
 */
export function createInterstitialAdController(): InterstitialAdController | null {
  const mod = getAdModule();
  if (!mod) return null;

  const { InterstitialAd, AdEventType } = mod;
  const adUnitId = getInterstitialAdUnitId();

  let state: InterstitialAdState = "idle";
  let unsubscribers: (() => void)[] = [];
  let interstitialAd: InterstitialAdInstance | null = null;

  function setupAd() {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers = [];

    interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    }) as InterstitialAdInstance;

    const ad = interstitialAd;

    unsubscribers.push(
      ad.addAdEventListener(AdEventType.LOADED, () => {
        state = "loaded";
      }),
    );

    unsubscribers.push(
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        state = "closed";
      }),
    );

    unsubscribers.push(
      ad.addAdEventListener(AdEventType.ERROR, () => {
        state = "error";
      }),
    );
  }

  return {
    load() {
      setupAd();
      state = "loading";
      interstitialAd!.load();
    },

    async show() {
      if (state !== "loaded") {
        throw new Error("Ad is not loaded yet");
      }
      state = "showing";
      await interstitialAd!.show();
    },

    getState() {
      return state;
    },

    dispose() {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers = [];
      interstitialAd = null;
      state = "idle";
    },
  };
}
