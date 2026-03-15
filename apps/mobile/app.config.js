/**
 * Expo設定ファイル（動的）
 * 環境変数を読み込んで設定
 *
 * ローカル開発: dotenvx run -f .env.local -- expo start
 * EAS Build: EAS 環境変数から直接読み込み
 */

const baseConfig = require("./app.json");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const webApiUrl = process.env.EXPO_PUBLIC_WEB_API_URL;
const revenuecatIosApiKey = process.env.EXPO_PUBLIC_REVENUCAT_IOS_API_KEY;

if (process.env.NODE_ENV === "development") {
  console.log("app.config.js - 環境変数の確認:");
  console.log(
    "EXPO_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "未設定",
  );
  console.log("EXPO_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "設定済み" : "未設定");
  console.log("EXPO_PUBLIC_WEB_API_URL:", webApiUrl || "未設定");
}

module.exports = {
  ...baseConfig.expo,
  updates: {
    url: "https://u.expo.dev/d123c26f-8ad7-4505-b6f2-11d82a741b99",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    ...baseConfig.expo.extra,
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey,
    webApiUrl: webApiUrl || "https://scanner.swim-hub.app",
    revenuecatIosApiKey: revenuecatIosApiKey || "",
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
    eas: {
      projectId: baseConfig.expo.extra?.eas?.projectId || "",
    },
  },
};
