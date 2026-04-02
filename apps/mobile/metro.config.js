// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// pnpmのシンボリンクを辿れるようにする
config.watchFolders = [monorepoRoot];

// React の重複インスタンス防止: 常に monorepo root の react に強制解決
const forceResolveModules = {
  react: path.resolve(monorepoRoot, "node_modules/react/index.js"),
  "react-native": path.resolve(monorepoRoot, "node_modules/react-native/index.js"),
};

config.resolver = {
  ...config.resolver,
  // pnpmシンボリンク対応
  unstable_enableSymlinks: true,
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
  ],
  resolveRequest: (context, moduleName, platform) => {
    if (forceResolveModules[moduleName]) {
      return { filePath: forceResolveModules[moduleName], type: "sourceFile" };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
