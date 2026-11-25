/**
 * 書き出し (画像・CSV・Excel) が成功したときだけ、ストアの評価を依頼する。
 * 失敗したときは依頼しない。
 */
import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockShareAsync = jest.fn();
const mockRequestStoreReviewOnce = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  writeAsStringAsync: jest.fn(async () => {}),
  EncodingType: { UTF8: "utf8", Base64: "base64" },
}));
jest.mock("expo-sharing", () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));
jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(async () => "file:///tmp/export.png"),
}));
jest.mock("@/lib/storeReview", () => ({
  requestStoreReviewOnce: () => mockRequestStoreReviewOnce(),
}));

import { ExportSheet } from "@/components/scanner/ExportSheet";
import { useScanResultStore } from "@/stores/scanResultStore";

const BUTTONS = [
  { label: "export.imageButton", errorKey: "export.imageError" },
  { label: "CSV", errorKey: "export.csvError" },
  { label: "Excel", errorKey: "export.excelError" },
];

describe("ExportSheet — ストアの評価の依頼", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    useScanResultStore.setState({
      menu: { distance: 50, repCount: 2, setCount: 1, circle: 60, description: "50m×2" },
      swimmers: [{ no: 1, name: "選手A", style: "Fr", times: [30.1, 31.2] }],
    });
  });

  it.each(BUTTONS)("$label の書き出しが成功したら依頼する", async ({ label }) => {
    mockShareAsync.mockResolvedValue(undefined);
    await render(<ExportSheet />);

    await fireEvent.press(screen.getByText(label));

    await waitFor(() => expect(mockRequestStoreReviewOnce).toHaveBeenCalledTimes(1));
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
  });

  it.each(BUTTONS)("$label の書き出しに失敗したら依頼しない", async ({ label, errorKey }) => {
    mockShareAsync.mockRejectedValue(new Error("share failed"));
    await render(<ExportSheet />);

    await fireEvent.press(screen.getByText(label));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("common.error", errorKey));
    expect(mockRequestStoreReviewOnce).not.toHaveBeenCalled();
  });
});
