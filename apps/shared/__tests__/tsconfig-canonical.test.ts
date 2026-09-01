import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Sprint #14 (swim-hub / swimhub-timer の target / strictness 統一) の回帰ガード。
 *
 * scanner はこの Sprint の変更対象ではない (GROUND_TRUTH.md: 「scanner が既に到達目標
 * (ES2022 + nuia true) = リファレンス実装。scanner は原則変更しない」)。
 * したがってこのファイルの全テストは実装前の現時点で **既に green** であるはずで、
 * それ自体が「scanner に意図しない差分が入っていないか」の回帰チェックになる。
 *
 * なぜここに置くか (CI から実行される場所):
 *   swimhub-scanner/.github/workflows/ci.yml の `test` ジョブは `pnpm test` (= `turbo test`) を
 *   呼び、turbo は pnpm workspace 内の全パッケージ (apps/shared 含む) の `test` script を実行する。
 *   apps/shared には `"test": "vitest run"` が定義されているため、このファイルは確実に CI で走る。
 *
 * swim-hub 側のテスト (swim-hub/apps/shared/__tests__/tsconfig-canonical.test.ts) と同じ
 * canonical 値を assert しているが、CI が各リポジトリを個別に checkout する構造上、
 * 3リポ間の一致は「3ファイルのリテラルが人間によって揃っている」ことに依存する
 * (cross-repo な自動検証はできない。QA report 参照)。
 */

function showConfig(relTsconfigPath: string): Record<string, unknown> {
  // require.resolve は使わず (swim-hub 側の CLAUDE.md の require() 禁止ルールに揃える)、
  // ローカル解決のみで済ませるため `--no-install` を付ける (ネットワークアクセスなし)。
  const cfgPath = path.resolve(process.cwd(), relTsconfigPath);
  const out = execFileSync("npx", ["--no-install", "tsc", "--showConfig", "-p", cfgPath], {
    encoding: "utf8",
  });
  return (JSON.parse(out).compilerOptions ?? {}) as Record<string, unknown>;
}

function normalizeLib(lib: unknown): string[] {
  if (!Array.isArray(lib)) return [];
  return [...lib].map((x) => String(x).toLowerCase()).sort();
}

const CANONICAL_CORE = {
  module: "esnext",
  moduleResolution: "bundler",
  strict: true,
  noUncheckedIndexedAccess: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  resolveJsonModule: true,
  isolatedModules: true,
};

describe("Sprint #14 tsconfig canonical values (swimhub-scanner, 変更対象外の回帰チェック)", () => {
  it("apps/web: 既に target ES2022 + canonical strictness + lib(dom,dom.iterable,es2022) + jsx/plugins", () => {
    const co = showConfig("../web/tsconfig.json");
    expect(co).toMatchObject({ ...CANONICAL_CORE, target: "es2022" });
    expect(normalizeLib(co.lib)).toEqual(["dom", "dom.iterable", "es2022"]);
    expect(co.jsx).toBe("preserve");
    expect(co.plugins).toMatchObject([{ name: "next" }]);
  });

  it("apps/mobile: 既に target ES2022 + canonical strictness + lib(dom,es2022) + jsx react-native", () => {
    const co = showConfig("../mobile/tsconfig.json");
    expect(co).toMatchObject({ ...CANONICAL_CORE, target: "es2022" });
    expect(normalizeLib(co.lib)).toEqual(["dom", "es2022"]);
    expect(co.jsx).toBe("react-native");
  });

  it("apps/shared (自身): 既に target ES2022 + canonical strictness + lib は ES2022 のみ (DOM 不使用、swim-hub とは対照的な正当な逸脱)", () => {
    const co = showConfig("./tsconfig.json");
    expect(co).toMatchObject({ ...CANONICAL_CORE, target: "es2022" });
    // PM_RULINGS.md 論点1: 「scanner の base が lib:["ES2022"] を持てるのは scanner の shared が
    // window を使っていないから成立しているだけ」。DOM が無いことを期待値として明示することで、
    // 将来 scanner/apps/shared が window を使うようになった場合に「暗黙のまま放置」を防ぐ
    // (追加すべきときに気づけるように、逆側の landmine も固定しておく)。
    expect(normalizeLib(co.lib)).toEqual(["es2022"]);
  });

  it("packages/i18n: 既に target ES2022 + canonical strictness + lib(es2022) + declaration系 true", () => {
    const co = showConfig("../../packages/i18n/tsconfig.json");
    expect(co).toMatchObject({ ...CANONICAL_CORE, target: "es2022" });
    expect(normalizeLib(co.lib)).toEqual(["es2022"]);
    expect(co.declaration).toBe(true);
    expect(co.declarationMap).toBe(true);
    expect(co.sourceMap).toBe(true);
  });
});
