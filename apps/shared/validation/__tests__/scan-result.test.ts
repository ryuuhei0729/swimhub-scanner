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
});
