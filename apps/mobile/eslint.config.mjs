import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Test infra (jest.setup.js, __tests__/**) is the first real (non-skeleton) code to
    // use live jest.* globals in this app; without this the `jest`/`describe`/`it` globals
    // trip `no-undef` for any test that isn't just commented-out scaffolding.
    files: ["jest.setup.js", "jest.config.js", "__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ["node_modules/", ".expo/", "ios/", "android/"],
  },
];
