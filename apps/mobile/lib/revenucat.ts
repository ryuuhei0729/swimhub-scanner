/**
 * RevenueCat SDK ラッパー
 * iOS は App Store (appl_ キー)、Android は Google Play (goog_ キー) を使用する。
 * プラットフォームに対応する有効なAPIキーが設定されている場合のみ初期化する。
 * キー未設定（または無効）の場合は全操作を no-op とし、課金UIを無効化する。
 */
import { Platform } from "react-native";
import Purchases, {
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo,
} from "react-native-purchases";
import { env } from "@/lib/env";

/** プラットフォームごとの API キーと、その期待されるプレフィックス */
const API_KEY = Platform.select({
  ios: env.revenuecatIosApiKey,
  android: env.revenuecatAndroidApiKey,
  default: "",
});
const EXPECTED_PREFIX = Platform.select({ ios: "appl_", android: "goog_", default: "" });

/**
 * RevenueCat の Premium entitlement 識別子。
 * AuthProvider / paywall / account 画面で共通利用し、直書きの三重定義を避ける。
 */
export const PREMIUM_ENTITLEMENT_ID = "premium";

const isValidApiKey =
  !!API_KEY &&
  !!EXPECTED_PREFIX &&
  API_KEY.startsWith(EXPECTED_PREFIX) &&
  !API_KEY.includes("PLACEHOLDER");

let isInitialized = false;

/** SDK が未初期化の状態で課金系操作を呼び出した場合に投げるエラー */
export class RevenueCatNotInitializedError extends Error {
  constructor() {
    super("RevenueCat SDK が初期化されていません");
    this.name = "RevenueCatNotInitializedError";
  }
}

/** SDK を初期化する（対応プラットフォームの有効なAPIキーがある場合のみ） */
export async function initRevenueCat(): Promise<void> {
  if (isInitialized) return;
  if (!isValidApiKey) {
    console.log(`RevenueCat: ${Platform.OS} 用APIキー未設定のため初期化をスキップします`);
    return;
  }

  try {
    Purchases.configure({ apiKey: API_KEY! });
    isInitialized = true;
  } catch (err) {
    console.error("RevenueCat 初期化エラー:", err);
  }
}

/** Supabase user.id で RevenueCat にログインする */
export async function loginRevenueCat(userId: string): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.error("RevenueCat ログインエラー:", err);
  }
}

/** RevenueCat からログアウトする */
export async function logoutRevenueCat(): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
  } catch (err) {
    console.error("RevenueCat ログアウトエラー:", err);
  }
}

/** 利用可能なオファリングを取得する */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isInitialized) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (err) {
    console.error("RevenueCat オファリング取得エラー:", err);
    return null;
  }
}

/** パッケージを購入する */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  if (!isInitialized) return null;

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err: unknown) {
    // ユーザーがキャンセルした場合はエラーとして扱わない
    if (err && typeof err === "object" && "userCancelled" in err && err.userCancelled) {
      return null;
    }
    throw err;
  }
}

/**
 * 購入をリストアする。
 * SDK 未初期化の場合は `RevenueCatNotInitializedError` を投げる（成功扱いにしない）。
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  if (!isInitialized) {
    throw new RevenueCatNotInitializedError();
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (err) {
    console.error("RevenueCat リストアエラー:", err);
    throw err;
  }
}

/** 顧客情報を取得する */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (err) {
    console.error("RevenueCat 顧客情報取得エラー:", err);
    return null;
  }
}

/** 顧客情報の変更リスナーを登録する。クリーンアップ用の関数を返す */
export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!isInitialized) {
    return () => {};
  }

  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
