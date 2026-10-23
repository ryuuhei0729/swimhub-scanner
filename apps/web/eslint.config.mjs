import nextConfig from "eslint-config-next";
import { globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  // OpenNext 1.20 の出力 (.open-next/) には .cjs が含まれ、eslint-config-next の files glob
  // (js/jsx/mjs/ts/tsx/mts/cts) の外なので plugin 未定義エラーになる。ビルド成果物は lint 対象外にする。
  globalIgnores([".next/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "next-env.d.ts"]),
  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/exhaustive-deps": "error",
      // eslint-config-next 16.4 が同梱する react-hooks 7 の新ルール。swim-hub と同じく off
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
