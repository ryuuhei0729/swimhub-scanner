import { describe, expect, it } from "vitest";
import { validateScanResult } from "../scan-result";

const validData = {
  menu: {
    distance: 50,
    repCount: 4,
    setCount: 1,
    circle: 60,
    description: "50m x 4",
  },
  swimmers: [
    {
      no: 1,
      name: "田中太郎",
      style: "Fr",
      times: [30.5, 31.2, 30.8, 31.0],
    },
    {
      no: 2,
      name: "鈴木花子",
      style: "Br",
      times: [35.1, null, 34.8, 35.3],
    },
  ],
};

describe("validateScanResult", () => {
  it("validates correct data", () => {
    expect(validateScanResult(validData)).toBe(true);
  });

  it("validates all stroke types", () => {
    for (const style of ["Fr", "Br", "Ba", "Fly", "IM"]) {
      const data = {
        menu: { distance: 50, repCount: 1, setCount: 1, circle: null, description: "" },
        swimmers: [{ no: 1, name: "test", style, times: [30] }],
      };
      expect(validateScanResult(data)).toBe(true);
    }
  });

  it("rejects null", () => {
    expect(validateScanResult(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateScanResult(undefined)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(validateScanResult("string")).toBe(false);
    expect(validateScanResult(42)).toBe(false);
  });

  it("rejects missing menu", () => {
    expect(validateScanResult({ swimmers: [] })).toBe(false);
  });

  it("rejects missing swimmers", () => {
    expect(
      validateScanResult({
        menu: { distance: 50, repCount: 1, setCount: 1 },
      }),
    ).toBe(false);
  });

  it("rejects non-array swimmers", () => {
    expect(
      validateScanResult({
        menu: { distance: 50, repCount: 1, setCount: 1 },
        swimmers: "not-array",
      }),
    ).toBe(false);
  });

  it("rejects missing menu.distance", () => {
    expect(
      validateScanResult({
        menu: { repCount: 1, setCount: 1 },
        swimmers: [],
      }),
    ).toBe(false);
  });

  it("rejects missing menu.repCount", () => {
    expect(
      validateScanResult({
        menu: { distance: 50, setCount: 1 },
        swimmers: [],
      }),
    ).toBe(false);
  });

  it("rejects missing menu.setCount", () => {
    expect(
      validateScanResult({
        menu: { distance: 50, repCount: 1 },
        swimmers: [],
      }),
    ).toBe(false);
  });

  it("rejects swimmer with invalid style", () => {
    const data = {
      menu: { distance: 50, repCount: 1, setCount: 1 },
      swimmers: [{ no: 1, name: "test", style: "Crawl", times: [30] }],
    };
    expect(validateScanResult(data)).toBe(false);
  });

  it("rejects swimmer with missing no", () => {
    const data = {
      menu: { distance: 50, repCount: 1, setCount: 1 },
      swimmers: [{ name: "test", style: "Fr", times: [30] }],
    };
    expect(validateScanResult(data)).toBe(false);
  });

  it("rejects swimmer with missing name", () => {
    const data = {
      menu: { distance: 50, repCount: 1, setCount: 1 },
      swimmers: [{ no: 1, style: "Fr", times: [30] }],
    };
    expect(validateScanResult(data)).toBe(false);
  });

  it("rejects swimmer with non-array times", () => {
    const data = {
      menu: { distance: 50, repCount: 1, setCount: 1 },
      swimmers: [{ no: 1, name: "test", style: "Fr", times: "30" }],
    };
    expect(validateScanResult(data)).toBe(false);
  });

  it("accepts empty swimmers array", () => {
    const data = {
      menu: { distance: 50, repCount: 1, setCount: 1 },
      swimmers: [],
    };
    expect(validateScanResult(data)).toBe(true);
  });

  // QA Phase B — Sprint Contract V16/V17 (M-6: OCR 数値の上限検証)
  // menu.distance/repCount/setCount に OCR 誤読相当の異常値が入ったレスポンスを
  // 個別に (999999 / 1e9 / Infinity / -1 / 4.5 / NaN) 検証する。
  describe("M-6: 数値上限・整数性検証 (V16)", () => {
    const baseMenu = { distance: 50, repCount: 8, setCount: 3 };
    const baseSwimmer = { no: 1, name: "田中太郎", style: "Fr" as const, times: [30.5] };

    function withMenu(overrides: Partial<typeof baseMenu>) {
      return {
        menu: { ...baseMenu, ...overrides },
        swimmers: [baseSwimmer],
      };
    }

    it("V16: repCount=999999 (異常な巨大値) は false", () => {
      expect(validateScanResult(withMenu({ repCount: 999999 }))).toBe(false);
    });

    it("V16: setCount=1e9 (指数表記の巨大値) は false", () => {
      expect(validateScanResult(withMenu({ setCount: 1e9 }))).toBe(false);
    });

    it("V16: distance=Infinity は false", () => {
      expect(validateScanResult(withMenu({ distance: Infinity }))).toBe(false);
    });

    it("V16: distance=-Infinity は false", () => {
      expect(validateScanResult(withMenu({ distance: -Infinity }))).toBe(false);
    });

    it("V16: repCount=-1 (負数) は false", () => {
      expect(validateScanResult(withMenu({ repCount: -1 }))).toBe(false);
    });

    it("V16: setCount=4.5 (非整数) は false", () => {
      expect(validateScanResult(withMenu({ setCount: 4.5 }))).toBe(false);
    });

    it("V16: distance=NaN は false", () => {
      expect(validateScanResult(withMenu({ distance: NaN }))).toBe(false);
    });

    it("V16: distance=0 (下限未満) は false", () => {
      expect(validateScanResult(withMenu({ distance: 0 }))).toBe(false);
    });

    it("V16: repCount=0 (下限未満) は false", () => {
      expect(validateScanResult(withMenu({ repCount: 0 }))).toBe(false);
    });

    it("V16: setCount=0 (下限未満) は false", () => {
      expect(validateScanResult(withMenu({ setCount: 0 }))).toBe(false);
    });

    it("V16: distance=4001 (上限超過) は false", () => {
      expect(validateScanResult(withMenu({ distance: 4001 }))).toBe(false);
    });

    it("V16: repCount=51 (上限超過) は false", () => {
      expect(validateScanResult(withMenu({ repCount: 51 }))).toBe(false);
    });

    it("V16: setCount=21 (上限超過) は false", () => {
      expect(validateScanResult(withMenu({ setCount: 21 }))).toBe(false);
    });

    it("V17: 50m×8×3 (通常メニュー) は true (正常系回帰)", () => {
      expect(validateScanResult(withMenu({ distance: 50, repCount: 8, setCount: 3 }))).toBe(true);
    });

    it("V17: 1500m×1×1 (公式最長距離) は true (正常系回帰)", () => {
      expect(validateScanResult(withMenu({ distance: 1500, repCount: 1, setCount: 1 }))).toBe(true);
    });

    it("V17: distance=4000 (上限ちょうど) は true (境界値)", () => {
      expect(validateScanResult(withMenu({ distance: 4000 }))).toBe(true);
    });

    it("V17: repCount=50 (上限ちょうど) は true (境界値)", () => {
      expect(validateScanResult(withMenu({ repCount: 50 }))).toBe(true);
    });

    it("V17: setCount=20 (上限ちょうど) は true (境界値)", () => {
      expect(validateScanResult(withMenu({ setCount: 20 }))).toBe(true);
    });

    it("V17: distance=1 (下限ちょうど) は true (境界値)", () => {
      expect(validateScanResult(withMenu({ distance: 1 }))).toBe(true);
    });
  });
});
