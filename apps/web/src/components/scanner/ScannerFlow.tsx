"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ScanTimesheetResponse,
  UserStatusResponse,
  ApiErrorResponse,
} from "@swimhub-scanner/shared";
import { ImageUploader } from "./ImageUploader";
import { ResultTable } from "./ResultTable";
import { ExportButtons } from "./ExportButtons";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { openTimesheetPrintWindow } from "@/lib/timesheet-print";

type Step = "upload" | "scanning" | "result";

export function ScannerFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<{ base64: string; mimeType: "image/jpeg" | "image/png" } | null>(null);
  const [result, setResult] = useState<ScanTimesheetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch user status on mount (cookie-based auth — no token needed)
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/user/status");
        if (res.ok) {
          setUserStatus(await res.json());
        }
      } catch {
        // Silently fail - status is non-critical
      } finally {
        setStatusLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const handleImageSelect = useCallback(
    (base64: string, mimeType: "image/jpeg" | "image/png") => {
      setImage({ base64, mimeType });
      setError(null);
    },
    [],
  );

  const handleScan = useCallback(async () => {
    if (!image) return;

    setStep("scanning");
    setError(null);

    try {
      const res = await fetch("/api/scan-timesheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: image.base64, mimeType: image.mimeType }),
      });

      if (!res.ok) {
        const err: ApiErrorResponse = await res.json();
        setError(err.error);
        setStep("upload");
        return;
      }

      const data: ScanTimesheetResponse = await res.json();
      setResult(data);
      setStep("result");

      // Refresh user status after scan
      const statusRes = await fetch("/api/user/status");
      if (statusRes.ok) {
        setUserStatus(await statusRes.json());
      }
    } catch {
      setError("ネットワークエラーです。接続を確認してください。");
      setStep("upload");
    }
  }, [image]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setImage(null);
    setResult(null);
    setError(null);
  }, []);

  const isLimitReached =
    !!userStatus && userStatus.dailyLimit !== null && userStatus.todayScanCount >= userStatus.dailyLimit;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Usage status bar */}
      {!statusLoading && userStatus && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-600">
            {userStatus.plan === "premium" ? (
              <span className="font-medium text-purple-600">Premium プラン</span>
            ) : (
              <>
                残り利用回数:{" "}
                <span className="font-bold">
                  {Math.max(0, (userStatus.dailyLimit ?? 0) - userStatus.todayScanCount)}
                </span>
                /{userStatus.dailyLimit} (0:00 JSTにリセット)
              </>
            )}
          </div>
          {userStatus.plan === "free" && (
            <Button variant="ghost" size="sm" className="text-purple-600">
              Premium にアップグレード
            </Button>
          )}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1: 画像アップロード</h2>

          {isLimitReached && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              本日の利用回数に達しました。Premium プランにアップグレードすると無制限に利用できます。
            </div>
          )}

          <ImageUploader onImageSelect={handleImageSelect} disabled={isLimitReached} />

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={handleScan}
              disabled={!image || isLimitReached}
            >
              解析する
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={openTimesheetPrintWindow}
            >
              <svg
                className="-ml-1 mr-1.5 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.25 7.034l-.008.001"
                />
              </svg>
              記録表テンプレートを印刷
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Scanning */}
      {step === "scanning" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-16">
          <LoadingSpinner className="h-12 w-12" />
          <p className="text-lg font-medium text-gray-700">画像を解析しています...</p>
          <p className="text-sm text-gray-500">AI が手書きのタイム記録表を読み取っています</p>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Step 3: 結果確認・修正</h2>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              新しいスキャン
            </Button>
          </div>

          <ResultTable data={result} onDataChange={setResult} />

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">出力</h3>
            <ExportButtons data={result} />
          </div>
        </div>
      )}
    </div>
  );
}
