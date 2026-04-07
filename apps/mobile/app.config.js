/**
 * Expo設定ファイル（動的）
 *
 * SDK 49+ では EXPO_PUBLIC_* は Metro がインライン展開するため、
 * extra への環境変数マッピングは不要。extra は EAS projectId 等の
 * ビルドメタデータのみを保持する。
 */
module.exports = {
  name: "SH Scanner",
  slug: "swimhub-scanner-mobile",
  version: "2.1.0",
  description: "手書きタイム記録表をAIで読み取りデジタル化するアプリ",
  scheme: "swimhub-scanner",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  plugins: [
    "./plugins/fix-fmt-consteval",
    "expo-router",
    "expo-apple-authentication",
    "expo-web-browser",
    [
      "expo-image-picker",
      {
        photosPermission:
          "タイム記録表の画像を選択するためにフォトライブラリを使用します",
        cameraPermission:
          "タイム記録表を撮影するためにカメラを使用します",
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          buildReactNativeFromSource: true,
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-4640414097368188~XXXXXXXXXX",
        iosAppId: "ca-app-pub-4640414097368188~6995328031",
      },
    ],
  ],
  splash: {
    image: "./assets/icon.png",
    resizeMode: "contain",
    backgroundColor: "#EFF6FF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.swim-hub.scanner",
    buildNumber: "24",
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription:
        "タイム記録表を撮影するためにカメラを使用します",
      NSPhotoLibraryUsageDescription:
        "タイム記録表の画像を選択するためにフォトライブラリを使用します",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "app.swimhub.scanner",
    versionCode: 18,
    permissions: ["android.permission.CAMERA"],
  },
  updates: {
    url: "https://u.expo.dev/d123c26f-8ad7-4505-b6f2-11d82a741b99",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    router: {},
    eas: {
      projectId: "d123c26f-8ad7-4505-b6f2-11d82a741b99",
    },
  },
};
