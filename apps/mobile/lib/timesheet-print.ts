/**
 * チーム記録表（タイムシート）テンプレートの共有ユーティリティ
 * バンドル済みPDF/画像をキャッシュにコピーして共有シートで表示
 */
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";

async function shareAsset(
  source: number,
  fileName: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  const assets = await Asset.loadAsync(source);
  const asset = assets[0];
  if (!asset?.localUri) throw new Error("Asset could not be loaded");

  const destUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.copyAsync({ from: asset.localUri, to: destUri });

  await Sharing.shareAsync(destUri, {
    mimeType,
    dialogTitle: "記録表テンプレート",
    UTI: uti,
  });
}

/**
 * 記録表テンプレートをPDFとして共有する（印刷向き）
 */
export async function shareTimesheetPdf(): Promise<void> {
  await shareAsset(
    require("../assets/timesheet-template.pdf"),
    "チーム記録表テンプレート.pdf",
    "application/pdf",
    "com.adobe.pdf",
  );
}

/**
 * 記録表テンプレートを画像として共有する（ライブラリ保存向き）
 */
export async function shareTimesheetImage(): Promise<void> {
  await shareAsset(
    require("../assets/timesheet-template.png"),
    "チーム記録表テンプレート.png",
    "image/png",
    "public.png",
  );
}
