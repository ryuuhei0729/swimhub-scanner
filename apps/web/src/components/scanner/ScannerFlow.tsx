"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ScanTimesheetResponse,
  UserStatusResponse,
  ApiErrorResponse,
} from "@swimhub-scanner/shared";
import { useAuth } from "@/hooks/useAuth";
import { ImageUploader } from "./ImageUploader";
import { ResultTable } from "./ResultTable";
import { ExportButtons } from "./ExportButtons";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Step = "upload" | "scanning" | "result";

export function ScannerFlow() {
  const { getIdToken } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<{ base64: string; mimeType: "image/jpeg" | "image/png" } | null>(null);
  const [result, setResult] = useState<ScanTimesheetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch user status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/user/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
  }, [getIdToken]);

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
      const token = await getIdToken();
      if (!token) {
        setError("認証エラーが発生しました。再ログインしてください。");
        setStep("upload");
        return;
      }

      const res = await fetch("/api/scan-timesheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      const statusRes = await fetch("/api/user/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statusRes.ok) {
        setUserStatus(await statusRes.json());
      }
    } catch {
      setError("ネットワークエラーです。接続を確認してください。");
      setStep("upload");
    }
  }, [image, getIdToken]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setImage(null);
    setResult(null);
    setError(null);
  }, []);

  const isLimitReached =
    userStatus && userStatus.dailyLimit !== null && userStatus.todayScanCount >= userStatus.dailyLimit;

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

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleScan}
              disabled={!image || isLimitReached}
            >
              解析する
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
