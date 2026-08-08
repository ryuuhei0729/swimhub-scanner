// QA Phase B — Sprint Contract V14/V15 (M-5: CSV インジェクション対策の shared 移設)
//
// V14: 選手名 =SUM(1+1) / +1 / -1 / @x / "quo"ted / a,b を含む CSV が
//      数式評価されず (先頭にシングルクォート付与)、列崩れもしない (ダブルクォートで囲み、
//      内部の " は "" にエスケープされる)。
// V15: mobile の CSV 出力が移設前と1バイトも変わらない。
//      移設前の実装 (git show HEAD:apps/mobile/components/scanner/ExportSheet.tsx の
//      escapeCsvValue) をこのテストにインライン移植し、同一入力での出力を比較する。
//
// 【再検証 (修正ループ第1ラウンド後)】担当 B が W-5 (OWASP 指摘の TAB/CR 始まり対策) で
// ガード対象を `/^[=+\-@]/` → `/^[=+\-@\t\r]/` に強化した。この変更が実際に効いている
// ことは元のテスト (TAB/CR が先頭に来る入力を含んでいなかった) では検証できていなかった
// ため、TAB/CR が先頭の入力を明示的に追加する。合わせて V15 の「1バイトも変わらない」を
// 「TAB/CR 始まりを除いて同一」に厳密化する (TAB/CR 始まりで挙動が変わるのは意図した
// 強化であり、回帰ではない)。LF (\n) 始まりは意図的に対象外 (ダブルクォートで囲まれた
// 正規の複数行データを壊すため) — この設計判断が実際に守られていることも検証する。
import { describe, it, expect } from "vitest";
import { escapeCsvValue } from "../csv";

// 移設前 (pre-M-5) の mobile ExportSheet.tsx L19-26 相当。
// ロジックを書き直さず、移設前コミットの実装をそのまま再現する
// (このテストの目的はロジック検証ではなく「1バイトも変わっていない」ことの証明)。
// 注意: これは W-5 より前の legacy 実装であり、TAB/CR はガード対象外のまま。
const legacyEscapeCsvValue = (value: string): string => {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
};

describe("escapeCsvValue — M-5 (V14)", () => {
  it("V14: 先頭が = の値 (数式インジェクション) はシングルクォートでガードされる", () => {
    expect(escapeCsvValue("=SUM(1+1)")).toBe(`"'=SUM(1+1)"`);
  });

  it("V14: 先頭が + の値もガードされる", () => {
    expect(escapeCsvValue("+1")).toBe(`"'+1"`);
  });

  it("V14: 先頭が - の値もガードされる", () => {
    expect(escapeCsvValue("-1")).toBe(`"'-1"`);
  });

  it("V14: 先頭が @ の値もガードされる", () => {
    expect(escapeCsvValue("@x")).toBe(`"'@x"`);
  });

  it("V14: 内部の \" は \"\" にエスケープされ列崩れしない", () => {
    expect(escapeCsvValue('"quo"ted')).toBe(`"""quo""ted"`);
  });

  it("V14: カンマを含む値はダブルクォートで囲まれ列崩れしない", () => {
    expect(escapeCsvValue("a,b")).toBe(`"a,b"`);
  });

  it("V14: 通常の値 (先頭が =+-@ 以外) はガードされずクォートのみ", () => {
    expect(escapeCsvValue("田中太郎")).toBe(`"田中太郎"`);
  });

  it("V14: 空文字は \"\" になる", () => {
    expect(escapeCsvValue("")).toBe(`""`);
  });

  it("V14: 先頭以外の位置の = はガードされない (先頭文字のみ判定)", () => {
    expect(escapeCsvValue("a=b")).toBe(`"a=b"`);
  });

  // --- W-5 再検証: TAB(\t) / CR(\r) が先頭の値もガードされること ---
  it("W-5/V14: 先頭が TAB (\\t) の値はシングルクォートでガードされる (OWASP 対策)", () => {
    expect(escapeCsvValue("\t=SUM(1+1)")).toBe(`"'\t=SUM(1+1)"`);
  });

  it("W-5/V14: 先頭が CR (\\r) の値はシングルクォートでガードされる (OWASP 対策)", () => {
    expect(escapeCsvValue("\r=SUM(1+1)")).toBe(`"'\r=SUM(1+1)"`);
  });

  it("W-5/V14: TAB 単体の値もガードされる", () => {
    expect(escapeCsvValue("\t")).toBe(`"'\t"`);
  });

  it("W-5/V14: CR 単体の値もガードされる", () => {
    expect(escapeCsvValue("\r")).toBe(`"'\r"`);
  });

  it("W-5/V14: 先頭以外の位置の TAB/CR はガードされない (先頭文字のみ判定、既存の =+-@ と同じ規則)", () => {
    expect(escapeCsvValue("a\tb")).toBe(`"a\tb"`);
    expect(escapeCsvValue("a\rb")).toBe(`"a\rb"`);
  });

  // --- 担当 B の設計判断 (LF は対象外) が実際に守られていることの確認 ---
  it("V14: 先頭が LF (\\n) の値はガードされない (ダブルクォートで囲まれた正規の複数行データを壊さないため意図的に対象外)", () => {
    expect(escapeCsvValue("\n=SUM(1+1)")).toBe(`"\n=SUM(1+1)"`);
  });

  it("V14: LF 単体の値もガードされない", () => {
    expect(escapeCsvValue("\n")).toBe(`"\n"`);
  });
});

describe("escapeCsvValue — mobile 移設前後の出力比較 (V15)", () => {
  // TAB/CR が先頭に来ない入力: W-5 以降も legacy (pre-M-5) と1バイトも変わらないはず。
  const casesUnaffectedByW5 = [
    "=SUM(1+1)",
    "+1",
    "-1",
    "@x",
    '"quo"ted',
    "a,b",
    "",
    "田中太郎",
    "50m Fr",
    "1:23.45",
    "改行\nを含む",
    "タブ\tを含む", // TAB は先頭ではなく中間 (W-5 の対象は先頭文字のみ) なので影響を受けない
    "----",
    "++--@@==",
    "a\"b\"c\"d",
    "\n=SUM(1+1)", // LF 始まりは W-5 の対象外なので legacy と同一のはず
  ];

  it.each(casesUnaffectedByW5)(
    "V15: 入力 %j に対する出力が移設前と1バイトも変わらない (TAB/CR 始まりを除く)",
    (input) => {
      expect(escapeCsvValue(input)).toBe(legacyEscapeCsvValue(input));
    },
  );

  // TAB/CR が先頭に来る入力: W-5 で意図的に legacy と挙動が変わる (これが強化の本体)。
  // 「1バイトも変わらない」の対象からは明示的に除外し、差分が意図通りであることを固定化する。
  const casesIntentionallyDivergedByW5 = ["\t=SUM(1+1)", "\r=SUM(1+1)", "\t", "\r"];

  it.each(casesIntentionallyDivergedByW5)(
    "W-5: 入力 %j は legacy (pre-M-5) の出力とは異なる (TAB/CR ガード追加は意図した強化であり回帰ではない)",
    (input) => {
      expect(escapeCsvValue(input)).not.toBe(legacyEscapeCsvValue(input));
      // 現行実装は先頭にシングルクォートを付与している
      expect(escapeCsvValue(input).startsWith(`"'`)).toBe(true);
      // legacy 実装はガードしない (今回の対策が無かったことの再確認)
      expect(legacyEscapeCsvValue(input).startsWith(`"'`)).toBe(false);
    },
  );
});
