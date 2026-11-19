import mobileAds, { AdsConsent } from "react-native-google-mobile-ads";
import {
  __resetAdsSdkForTest,
  isPrivacyOptionsRequired,
  prepareAdsSdk,
  subscribeAdsSdkPrepared,
} from "../ads-sdk";

const gatherConsent = AdsConsent.gatherConsent as jest.Mock;
const getConsentInfo = AdsConsent.getConsentInfo as jest.Mock;
const sdk = mobileAds() as unknown as {
  initialize: jest.Mock;
  setRequestConfiguration: jest.Mock;
};

describe("prepareAdsSdk", () => {
  beforeEach(() => {
    __resetAdsSdkForTest();
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    gatherConsent.mockResolvedValue({});
    getConsentInfo.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: "NOT_REQUIRED",
    });
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it("同意取得 → レーティング制限 → 初期化の順に行う", async () => {
    const order: string[] = [];
    gatherConsent.mockImplementation(async () => order.push("consent"));
    sdk.setRequestConfiguration.mockImplementation(async () => order.push("config"));
    sdk.initialize.mockImplementation(async () => order.push("init"));

    await expect(prepareAdsSdk()).resolves.toBe(true);
    expect(order).toEqual(["consent", "config", "init"]);
    expect(sdk.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: "PG" });
  });

  it("広告をリクエストできない（同意なし）場合は初期化せず false を返す", async () => {
    getConsentInfo.mockResolvedValue({ canRequestAds: false });

    await expect(prepareAdsSdk()).resolves.toBe(false);
    expect(sdk.initialize).not.toHaveBeenCalled();
  });

  it("同意情報の更新に失敗しても、前回の同意状態で広告を出せるなら続行する", async () => {
    gatherConsent.mockRejectedValue(new Error("offline"));

    await expect(prepareAdsSdk()).resolves.toBe(true);
    expect(sdk.initialize).toHaveBeenCalledTimes(1);
  });

  it("成功後は何度呼んでも 1 回しか処理しない", async () => {
    await Promise.all([prepareAdsSdk(), prepareAdsSdk()]);
    await prepareAdsSdk();
    expect(gatherConsent).toHaveBeenCalledTimes(1);
    expect(sdk.initialize).toHaveBeenCalledTimes(1);
  });

  it("失敗した場合は次回の呼び出しで再試行する", async () => {
    getConsentInfo.mockResolvedValueOnce({ canRequestAds: false });
    await expect(prepareAdsSdk()).resolves.toBe(false);
    await expect(prepareAdsSdk()).resolves.toBe(true);
    expect(gatherConsent).toHaveBeenCalledTimes(2);
  });
});

describe("subscribeAdsSdkPrepared", () => {
  beforeEach(() => {
    __resetAdsSdkForTest();
    jest.clearAllMocks();
    gatherConsent.mockResolvedValue({});
  });

  it("準備の試行が終わるたびに（成否を問わず）通知し、解除後は通知しない", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAdsSdkPrepared(listener);

    getConsentInfo.mockResolvedValueOnce({ canRequestAds: false });
    await prepareAdsSdk();
    expect(listener).toHaveBeenCalledTimes(1);

    getConsentInfo.mockResolvedValueOnce({ canRequestAds: true });
    await prepareAdsSdk();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    __resetAdsSdkForTest();
    getConsentInfo.mockResolvedValueOnce({ canRequestAds: true });
    await prepareAdsSdk();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("isPrivacyOptionsRequired", () => {
  it("UMP が REQUIRED を返した場合のみ true", async () => {
    getConsentInfo.mockResolvedValueOnce({ privacyOptionsRequirementStatus: "REQUIRED" });
    await expect(isPrivacyOptionsRequired()).resolves.toBe(true);

    getConsentInfo.mockResolvedValueOnce({ privacyOptionsRequirementStatus: "NOT_REQUIRED" });
    await expect(isPrivacyOptionsRequired()).resolves.toBe(false);

    getConsentInfo.mockRejectedValueOnce(new Error("x"));
    await expect(isPrivacyOptionsRequired()).resolves.toBe(false);
  });
});
