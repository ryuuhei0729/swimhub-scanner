/** Jest config for the mobile app (jest-expo preset). */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Resolve the workspace TS packages to their source so babel-jest transforms
  // them (they ship raw .ts via package "main", not a compiled build).
  moduleNameMapper: {
    "^@swimhub-scanner/shared$": "<rootDir>/../shared/index.ts",
    "^@swimhub-scanner/shared/(.*)$": "<rootDir>/../shared/$1",
    "^@swimhub-scanner/i18n$": "<rootDir>/../../packages/i18n/src/index.ts",
  },
  transformIgnorePatterns: [
    // @ryuuhei0729/.* (3アプリ共通パッケージ, 今後導入予定の swimhub-oauth 等) は ESM を
    // 出力する見込みのため、他の RN エコシステムパッケージ (下記の許可リスト参照) と
    // 同様に babel-jest でのトランスパイル対象に含める必要がある。Jest は CJS ベースの
    // require() で動くため、拡張子の有無とは無関係に生の import/export 構文をパースできない。
    // (timer mobile の jest.config.js で実測済みの必須設定。詳細はそちらのコメント参照)
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-google-mobile-ads|react-native-purchases|react-native-svg|@ryuuhei0729/.*))",
  ],
};
