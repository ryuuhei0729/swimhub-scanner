import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".next"],
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // handleAuthCallback は内部で next/headers の cookies() と @supabase/ssr を使う。
        // 外部依存のまま外に置くと vi.mock がパッケージ内部に届かず実物が使われるため、
        // 変換パイプラインに載せる必要がある(モジュール解決ではなくモック適用のための設定)。
        inline: [/@ryuuhei0729\/swimhub-oauth/],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", ".next/", "**/*.d.ts", "**/*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
