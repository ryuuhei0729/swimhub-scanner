import { InterstitialAd } from "react-native-google-mobile-ads";
import {
  AD_EXPIRY_MS,
  AD_RETRY_DELAYS_MS,
  createInterstitialAdController,
  isValidAdUnitId,
} from "../interstitial-ad";

type Listener = () => void;

/** InterstitialAd の振る舞いを手動で発火できるフェイク */
function createFakeAd() {
  const listeners = new Map<string, Listener[]>();
  return {
    load: jest.fn(),
    show: jest.fn(() => Promise.resolve()),
    addAdEventListener: jest.fn((type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      return () => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((l) => l !== listener),
        );
      };
    }),
    emit(type: string) {
      (listeners.get(type) ?? []).forEach((l) => l());
    },
  };
}

type FakeAd = ReturnType<typeof createFakeAd>;

const createForAdRequest = InterstitialAd.createForAdRequest as jest.Mock;

function at<T>(arr: T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`index ${i} out of range`);
  return v;
}
const UNIT_ID = "ca-app-pub-3940256099942544/4411468910";

describe("createInterstitialAdController", () => {
  let ads: FakeAd[];

  beforeEach(() => {
    jest.useFakeTimers();
    ads = [];
    createForAdRequest.mockReset();
    createForAdRequest.mockImplementation(() => {
      const ad = createFakeAd();
      ads.push(ad);
      return ad;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("非パーソナライズ広告として読み込みを開始する", () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();

    expect(createForAdRequest).toHaveBeenCalledWith(UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    expect(at(ads, 0).load).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toBe("loading");
  });

  it("読み込み中・読み込み済みの間は再リクエストしない（画像の選び直し対策）", () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(1);

    at(ads, 0).emit("loaded");
    expect(controller.isReady()).toBe(true);
    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(1);
  });

  it("読み込みから有効期限を過ぎた広告は表示せず、読み直す", async () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("loaded");

    jest.advanceTimersByTime(AD_EXPIRY_MS);
    expect(controller.isReady()).toBe(false);
    await expect(controller.show()).resolves.toBe(false);
    expect(at(ads, 0).show).not.toHaveBeenCalled();

    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(2);
  });

  it("読み込み済みなら表示して true を返し、閉じたら closed になる", async () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("loaded");

    await expect(controller.show()).resolves.toBe(true);
    expect(at(ads, 0).show).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toBe("showing");

    at(ads, 0).emit("closed");
    expect(controller.getState()).toBe("closed");
    expect(controller.isReady()).toBe(false);

    // 次の機会には新しい広告を読み込む
    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(2);
  });

  it("未読み込みなら表示しない", async () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    await expect(controller.show()).resolves.toBe(false);
    expect(at(ads, 0).show).not.toHaveBeenCalled();
  });

  it("表示に失敗したら false を返し、次回は読み直す", async () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("loaded");
    at(ads, 0).show.mockImplementationOnce(() => Promise.reject(new Error("no activity")));

    await expect(controller.show()).resolves.toBe(false);
    expect(controller.getState()).toBe("error");

    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(2);
  });

  it("表示の失敗が ERROR イベントで届いても showing のまま固まらず、次回は読み直す", async () => {
    // iOS は show() が表示呼び出し直後に解決し、表示失敗は ERROR イベントで通知される
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("loaded");
    await expect(controller.show()).resolves.toBe(true);

    at(ads, 0).emit("error");
    expect(controller.getState()).toBe("error");

    // 表示失敗では自動再試行しない
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(createForAdRequest).toHaveBeenCalledTimes(1);

    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(2);
  });

  it("読み込み失敗時は指数バックオフで決められた回数だけ再試行する", () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();

    AD_RETRY_DELAYS_MS.forEach((delay, i) => {
      at(ads, i).emit("error");
      expect(controller.getState()).toBe("error");
      jest.advanceTimersByTime(delay - 1);
      expect(createForAdRequest).toHaveBeenCalledTimes(i + 1);
      jest.advanceTimersByTime(1);
      expect(createForAdRequest).toHaveBeenCalledTimes(i + 2);
    });

    // 上限に達したらそれ以上は自動で再試行しない
    at(ads, ads.length - 1).emit("error");
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(createForAdRequest).toHaveBeenCalledTimes(AD_RETRY_DELAYS_MS.length + 1);

    // ユーザー操作 (ensureLoaded) を契機には再度読み込める
    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(AD_RETRY_DELAYS_MS.length + 2);
  });

  it("再試行待ち中に ensureLoaded されたら待たずに読み込み、タイマー分の二重読み込みはしない", () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("error");

    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(at(AD_RETRY_DELAYS_MS, 0));
    expect(createForAdRequest).toHaveBeenCalledTimes(2);
  });

  it("古い広告インスタンスのイベントは無視する", () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("error");
    controller.ensureLoaded();

    // 破棄済みの at(ads, 0) からイベントが来ても状態は変わらない
    at(ads, 0).emit("loaded");
    expect(controller.getState()).toBe("loading");
  });

  it("dispose 後は再試行タイマーも止まり、読み込みもしない", () => {
    const controller = createInterstitialAdController(UNIT_ID)!;
    controller.ensureLoaded();
    at(ads, 0).emit("error");
    controller.dispose();

    jest.advanceTimersByTime(10 * 60 * 1000);
    controller.ensureLoaded();
    expect(createForAdRequest).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toBe("idle");
  });
});

describe("isValidAdUnitId", () => {
  it("正しい形式の広告ユニット ID のみ許可する", () => {
    expect(isValidAdUnitId("ca-app-pub-4640414097368188/1234567890")).toBe(true);
    expect(isValidAdUnitId("ca-app-pub-4640414097368188/SCANNER_IOS_INTERSTITIAL_UNIT_ID")).toBe(
      false,
    );
    expect(isValidAdUnitId("")).toBe(false);
  });
});
