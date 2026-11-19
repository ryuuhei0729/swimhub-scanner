/**
 * Google Mobile Ads SDK の準備（同意取得 → リクエスト設定 → 初期化）を一元管理する。
 *
 * Google 推奨の順序:
 *   1. UMP (User Messaging Platform) で同意情報を更新し、必要なら同意フォームを表示する
 *      （EEA / 英国 / スイス、米国の一部州など。日本では通常フォームは出ない）
 *   2. canRequestAds が true の場合のみ SDK を初期化して広告をリクエストする
 *
 * 非パーソナライズ広告 (requestNonPersonalizedAdsOnly) であっても、EEA では端末への
 * 情報保存に同意が必要なため UMP は省略できない。
 *
 * ネイティブモジュールが無い環境（Expo Go / テスト）では何もせず false を返す。
 */

export function getAdModule() {
  try {
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

let preparePromise: Promise<boolean> | null = null;
const preparedListeners = new Set<() => void>();

/**
 * prepareAdsSdk の 1 回の試行が終わるたびに呼ばれるリスナーを登録する（成否は問わない）。
 * 同意状態に依存する UI（プライバシー設定リンク）が、自分で同意フォームを起動せずに
 * 最新の状態を反映するために使う。戻り値で登録解除。
 */
export function subscribeAdsSdkPrepared(listener: () => void): () => void {
  preparedListeners.add(listener);
  return () => {
    preparedListeners.delete(listener);
  };
}

async function doPrepare(): Promise<boolean> {
  const mod = getAdModule();
  if (!mod) return false;

  const { AdsConsent, MaxAdContentRating } = mod;
  const mobileAds = mod.default;

  // 1. 同意情報の更新 + 必要なら同意フォーム表示。
  //    オフライン等で失敗しても、前回セッションで得た同意状態で判定できるため続行する。
  try {
    await AdsConsent.gatherConsent();
  } catch (err) {
    console.warn("広告の同意情報の更新に失敗:", err);
  }

  let canRequestAds = false;
  try {
    const info = await AdsConsent.getConsentInfo();
    canRequestAds = info.canRequestAds;
  } catch (err) {
    console.warn("広告の同意情報の取得に失敗:", err);
  }
  if (!canRequestAds) return false;

  // 2. リクエスト設定。水泳クラブでは子どもが利用する場面もあるため、
  //    広告のコンテンツレーティングを PG（保護者の指導の下で全年齢向け）までに制限する。
  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
    });
  } catch (err) {
    console.warn("広告のリクエスト設定に失敗:", err);
  }

  // 3. SDK 初期化（失敗しても load 側で SDK が内部的に初期化を試みるため続行可）
  try {
    await mobileAds().initialize();
  } catch (err) {
    console.warn("広告 SDK の初期化に失敗:", err);
  }

  return true;
}

/**
 * 広告を出してよい状態まで SDK を準備する。複数回呼んでも処理は 1 回だけ走る。
 * 広告をリクエストできない（同意未取得・オフラインの初回起動など）場合は false を返し、
 * 次回呼び出し時に再試行できるようにする。
 */
export function prepareAdsSdk(): Promise<boolean> {
  if (!preparePromise) {
    preparePromise = doPrepare().then((ok) => {
      if (!ok) preparePromise = null;
      preparedListeners.forEach((listener) => listener());
      return ok;
    });
  }
  return preparePromise;
}

/**
 * 「プライバシー設定」の入口を表示する必要があるか（EEA 等で同意を取得した場合に必須）。
 * Google の EU ユーザー同意ポリシーにより、ユーザーがいつでも同意を変更できる導線が必要。
 */
export async function isPrivacyOptionsRequired(): Promise<boolean> {
  const mod = getAdModule();
  if (!mod) return false;
  try {
    const info = await mod.AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === "REQUIRED";
  } catch {
    return false;
  }
}

/** UMP のプライバシー設定フォームを表示する */
export async function showPrivacyOptionsForm(): Promise<void> {
  const mod = getAdModule();
  if (!mod) return;
  await mod.AdsConsent.showPrivacyOptionsForm();
}

/** テスト用: モジュール内のキャッシュを破棄する */
export function __resetAdsSdkForTest() {
  preparePromise = null;
  preparedListeners.clear();
}
