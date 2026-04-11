/**
 * 環境変数の統一アクセスヘルパー
 *
 * Expo SDK 49+ では Metro が EXPO_PUBLIC_* をビルド時にインライン展開するため、
 * process.env.EXPO_PUBLIC_* だけで EAS クラウド / ローカル両方で動作する。
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  webApiUrl: process.env.EXPO_PUBLIC_WEB_API_URL || "https://scanner.swim-hub.app",
  revenuecatIosApiKey: process.env.EXPO_PUBLIC_REVENUCAT_IOS_API_KEY ?? "",
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
} as const;
