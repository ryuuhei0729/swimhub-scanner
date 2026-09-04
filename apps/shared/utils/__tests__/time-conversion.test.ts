import { describe, expect, it } from "vitest";
import {
  averageTime,
  fastestTime,
  formatCircleTime,
  formatTime,
  rawStringToSeconds,
  slowestTime,
} from "../time-conversion";

describe("rawStringToSeconds", () => {
  it("converts 3-digit string to seconds", () => {
    expect(rawStringToSeconds("364")).toBe(36.4);
  });

  it("converts 4-digit string to seconds", () => {
    expect(rawStringToSeconds("1052")).toBe(105.2);
  });

  it("converts single digit", () => {
    expect(rawStringToSeconds("5")).toBe(0.5);
  });

  it("converts zero", () => {
    expect(rawStringToSeconds("0")).toBe(0);
  });

  it("strips whitespace", () => {
    expect(rawStringToSeconds(" 3 6 4 ")).toBe(36.4);
  });

  it("returns null for non-numeric string", () => {
    expect(rawStringToSeconds("abc")).toBeNull();
  });

  it("returns null for negative number", () => {
    expect(rawStringToSeconds("-10")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(rawStringToSeconds("")).toBeNull();
  });
});

// NOTE (Sprint: GitHub Issue #13 種目略称/タイム表示統一, PM裁定 2026-09-01):
//   formatTime は CLAUDE.md のタイム表示規約 (分:秒.コンマ秒=小数第2位) に合わせて
//   1桁から2桁表示に変更された。ただし元データの実測精度が変わったわけではない。
//   Gemini OCR (apps/web/src/lib/gemini/prompt.ts) が読み取る手書きタイムシートは
//   1/10秒精度でしか記録されていないため、小数第2位は常に末尾0埋め
//   (例: 36.4秒 → "36.40"。"36.4X" のような実測2桁精度の値は入力として来ない)。
//   次にこのファイルを触る担当者は、2桁になったことを「精度が上がった」と
//   誤解しないこと — これは表示桁数の統一であり、OCRの実測精度は1/10秒のまま。
describe("formatTime", () => {
  it("formats seconds under 60 with two decimals (元精度は1/10秒、末尾0埋め)", () => {
    expect(formatTime(36.4)).toBe("36.40");
  });

  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("0.00");
  });

  it("formats seconds at 60 boundary", () => {
    expect(formatTime(60)).toBe("1:00.00");
  });

  it("formats minutes with padded seconds", () => {
    expect(formatTime(65.2)).toBe("1:05.20");
  });

  it("formats large times", () => {
    expect(formatTime(125.3)).toBe("2:05.30");
  });

  it("formats fractional seconds under 10", () => {
    expect(formatTime(5.1)).toBe("5.10");
  });
});

describe("averageTime", () => {
  it("calculates average of valid times", () => {
    expect(averageTime([30, 32, 34])).toBe(32);
  });

  it("ignores null values", () => {
    expect(averageTime([30, null, 34])).toBe(32);
  });

  it("returns null for empty array", () => {
    expect(averageTime([])).toBeNull();
  });

  it("returns null for all-null array", () => {
    expect(averageTime([null, null])).toBeNull();
  });

  it("rounds to one decimal", () => {
    expect(averageTime([30.1, 30.2, 30.3])).toBe(30.2);
  });

  it("handles single value", () => {
    expect(averageTime([25.5])).toBe(25.5);
  });
});

describe("fastestTime", () => {
  it("returns minimum time", () => {
    expect(fastestTime([30, 28, 32])).toBe(28);
  });

  it("ignores null values", () => {
    expect(fastestTime([null, 30, null, 28])).toBe(28);
  });

  it("returns null for empty array", () => {
    expect(fastestTime([])).toBeNull();
  });

  it("returns null for all-null array", () => {
    expect(fastestTime([null, null])).toBeNull();
  });

  it("handles single value", () => {
    expect(fastestTime([25.5])).toBe(25.5);
  });
});

describe("slowestTime", () => {
  it("returns maximum time", () => {
    expect(slowestTime([30, 28, 32])).toBe(32);
  });

  it("ignores null values", () => {
    expect(slowestTime([null, 30, null, 32])).toBe(32);
  });

  it("returns null for empty array", () => {
    expect(slowestTime([])).toBeNull();
  });

  it("returns null for all-null array", () => {
    expect(slowestTime([null, null])).toBeNull();
  });
});

describe("formatCircleTime", () => {
  it("formats seconds under 60", () => {
    expect(formatCircleTime(45)).toBe('45"');
  });

  it("formats exactly 60 seconds", () => {
    expect(formatCircleTime(60)).toBe("1'00\"");
  });

  it("formats minutes and seconds", () => {
    expect(formatCircleTime(130)).toBe("2'10\"");
  });

  it("pads single-digit seconds", () => {
    expect(formatCircleTime(65)).toBe("1'05\"");
  });

  it("formats zero", () => {
    expect(formatCircleTime(0)).toBe('0"');
  });
});
