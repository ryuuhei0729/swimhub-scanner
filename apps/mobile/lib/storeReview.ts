// =============================================================================
// ストアの評価ダイアログ (OS 標準の In-App Review)
// =============================================================================
//
// 読み取ったタイムシートを書き出せたとき、端末ごとに1回だけ評価を依頼する。
// 表示するかどうかは OS が決め (iOS は 365 日に3回まで)、実際に出たかはアプリから分からない。
// 依頼済みの印はログアウトしても消さない (同じ端末で何度も依頼しないため)。

import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as StoreReviewModule from "expo-store-review";

const STORAGE_KEY = "store-review-requested";

/** 共有シートが閉じきってから依頼する */
export const STORE_REVIEW_DELAY_MS = 1000;

let inFlight = false;

/**
 * 書き出しが成功した直後に呼ぶ。失敗しても書き出しそのものには影響させないので、例外は投げない。
 */
export async function requestStoreReviewOnce(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    if ((await AsyncStorage.getItem(STORAGE_KEY)) !== null) return;
    await new Promise((resolve) => setTimeout(resolve, STORE_REVIEW_DELAY_MS));
    // ネイティブモジュールが無いバイナリ (追加前のビルドに OTA で届いた場合) では import 時に
    // 例外になるので、使う直前に読み込む。requestReview() はネイティブが無いとストアの URL を
    // 開いてしまうため、isAvailableAsync() が true のときだけ呼ぶ (TestFlight では false)。
    const StoreReview = require("expo-store-review") as typeof StoreReviewModule;
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    await StoreReview.requestReview();
  } catch {
    // 評価の依頼に失敗しても無視する
  } finally {
    inFlight = false;
  }
}
