// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// pnpmのシンボリンクを辿れるようにする
config.watchFolders = [monorepoRoot];

config.resolver = {
  ...config.resolver,
  // pnpmシンボリンク対応
  unstable_enableSymlinks: true,
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
  ],
  resolveRequest: (context, moduleName, platform) => {
    // pnpmシンボリンクを明示的に解決する（react, react-dom, その他ネイティブモジュール）
    const forceLocalResolve = ["react", "react-dom", "react-native-view-shot"];
    if (forceLocalResolve.includes(moduleName)) {
      try {
        const modPath = path.resolve(projectRoot, "node_modules", moduleName);
        return {
          filePath: require.resolve(modPath),
          type: "sourceFile",
        };
      } catch (e) {
        // フォールバック: デフォルトの解決を使用
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
