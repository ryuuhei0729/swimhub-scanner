import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { STORE_REVIEW_DELAY_MS, requestStoreReviewOnce } from "../storeReview";

const isAvailableAsync = StoreReview.isAvailableAsync as jest.Mock;
const requestReview = StoreReview.requestReview as jest.Mock;

async function run(promise: Promise<unknown>) {
  await jest.advanceTimersByTimeAsync(STORE_REVIEW_DELAY_MS);
  await promise;
}

describe("requestStoreReviewOnce (scanner mobile)", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    jest.clearAllMocks();
    isAvailableAsync.mockResolvedValue(true);
    requestReview.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("未依頼なら、待ってから依頼し、依頼済みの印を残す", async () => {
    const promise = requestStoreReviewOnce();
    await jest.advanceTimersByTimeAsync(STORE_REVIEW_DELAY_MS - 1);
    expect(requestReview).not.toHaveBeenCalled();

    await run(promise);

    expect(requestReview).toHaveBeenCalledTimes(1);
    await expect(AsyncStorage.getItem("store-review-requested")).resolves.not.toBeNull();
  });

  it("2回目以降は依頼しない", async () => {
    await run(requestStoreReviewOnce());
    await run(requestStoreReviewOnce());

    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it("使えない環境 (TestFlight など) では依頼せず、印も残さない (次の書き出しで依頼する)", async () => {
    isAvailableAsync.mockResolvedValue(false);

    await run(requestStoreReviewOnce());

    expect(requestReview).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem("store-review-requested")).resolves.toBeNull();
  });

  it("続けて呼ばれても依頼は1回だけ", async () => {
    await run(Promise.all([requestStoreReviewOnce(), requestStoreReviewOnce()]));

    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it("依頼や保存に失敗しても例外を投げない", async () => {
    requestReview.mockRejectedValueOnce(new Error("native"));
    await expect(run(requestStoreReviewOnce())).resolves.toBeUndefined();

    await AsyncStorage.clear();
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("io"));
    await expect(run(requestStoreReviewOnce())).resolves.toBeUndefined();
  });

  it("ネイティブモジュールが無いバイナリでも例外を投げず、ストアの URL も開かない", async () => {
    jest.resetModules();
    jest.doMock("expo-store-review", () => {
      throw new Error("Cannot find native module 'ExpoStoreReview'");
    });
    try {
      const fresh = jest.requireActual<typeof import("../storeReview")>("../storeReview");
      const storage = jest.requireMock<typeof AsyncStorage>("@react-native-async-storage/async-storage");
      await expect(run(fresh.requestStoreReviewOnce())).resolves.toBeUndefined();
      await expect(storage.getItem("store-review-requested")).resolves.toBeNull();
    } finally {
      jest.dontMock("expo-store-review");
      jest.resetModules();
    }
  });
});
