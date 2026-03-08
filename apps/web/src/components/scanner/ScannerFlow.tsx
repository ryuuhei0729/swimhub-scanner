"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  ScanTimesheetResponse,
  UserStatusResponse,
  ApiErrorResponse,
} from "@swimhub-scanner/shared";
import Image from "next/image";
import Link from "next/link";
import { ImageUploader } from "./ImageUploader";
import { ResultTable } from "./ResultTable";
import { ExportButtons } from "./ExportButtons";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { openTimesheetPrintWindow } from "@/lib/timesheet-print";
import { useAuth } from "@/hooks/useAuth";
import { getGuestTokenBalance, consumeGuestToken } from "@/lib/guest-tokens";
import {
  createRewardedAdController,
  type AdState,
  type RewardedAdController,
} from "@/lib/ads/rewarded-ad";

type Step = "upload" | "scanning" | "result";

export type { Step };

export function ScannerFlow({ onStepChange }: { onStepChange?: (step: Step) => void }) {
  const { isGuest, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<{ base64: string; mimeType: "image/jpeg" | "image/png" } | null>(null);
  const [result, setResult] = useState<ScanTimesheetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null);
  const [guestTokens, setGuestTokens] = useState<number | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // --- Ad state ---
  const adControllerRef = useRef<RewardedAdController | null>(null);
  const [adState, setAdState] = useState<AdState>("idle");
  const [adUnavailable, setAdUnavailable] = useState(false);
  const [scanTriggered, setScanTriggered] = useState(false);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      if (isGuest) {
        const balance = getGuestTokenBalance();
        setGuestTokens(balance);
        setUserStatus(null);
      } else if (isAuthenticated) {
        const res = await fetch("/api/user/status");
        if (res.ok) {
          setUserStatus(await res.json());
        }
        setGuestTokens(null);
      }
    } catch {
      // Silently fail - status is non-critical
    } finally {
      setStatusLoading(false);
    }
  }, [isGuest, isAuthenticated]);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  // Fetch user status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Preload ad when user selects an image
  useEffect(() => {
    if (!image) return;

    const controller = createRewardedAdController();
    if (!controller) {
      const timer = setTimeout(() => setAdUnavailable(true), 0);
      return () => clearTimeout(timer);
    }
    adControllerRef.current = controller;

    const unsubscribe = controller.onStateChange((state) => {
      setAdState(state);
    });

    controller.load();

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [image]);

  // If ad loads AFTER scan was triggered, show it automatically
  useEffect(() => {
    if (scanTriggered && adState === "loaded" && !adUnavailable) {
      adControllerRef.current?.show();
    }
  }, [scanTriggered, adState, adUnavailable]);

  const handleRefresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  const handleImageSelect = useCallback(
    (base64: string, mimeType: "image/jpeg" | "image/png") => {
      setImage({ base64, mimeType });
      setError(null);
    },
    [],
  );

  const handleScan = useCallback(async () => {
    if (!image) return;

    // ゲスト: ローカルトークンチェック & 消費
    if (isGuest) {
      const success = consumeGuestToken();
      if (!success) {
        setError("無料トークンを使い切りました。アカウント登録するとトークンを購入できます。");
        return;
      }
    }

    setStep("scanning");
    setError(null);
    setScanTriggered(true);

    // --- Show ad (parallel with scanning) ---
    const controller = adControllerRef.current;
    if (controller) {
      const currentState = controller.getState();
      if (currentState === "loaded") {
        controller.show();
      } else if (currentState !== "loading") {
        setAdUnavailable(true);
      }
    }

    // --- Start API scan ---
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (isGuest) {
        headers["X-Guest-Mode"] = "true";
      }

      const res = await fetch("/api/scan-timesheet", {
        method: "POST",
        headers,
        body: JSON.stringify({ image: image.base64, mimeType: image.mimeType }),
      });

      if (!res.ok) {
        const errBody: ApiErrorResponse = await res.json();
        switch (errBody.code) {
          case "DAILY_LIMIT_EXCEEDED":
          case "TOKEN_EXHAUSTED":
            setError("利用回数上限に達しました。アカウント登録するとトークンを購入できます。");
            break;
          case "SWIMMER_LIMIT_EXCEEDED":
            setError("無料プランでは8名まで解析可能です");
            break;
          case "PARSE_ERROR":
            setError("画像からタイム情報を読み取れませんでした。鮮明なタイム記録表の画像を使用してください");
            break;
          default:
            setError(errBody.error);
        }
        setStep("upload");
        return;
      }

      const data: ScanTimesheetResponse = await res.json();
      setResult(data);
      setStep("result");

      // Refresh user status after scan
      await fetchStatus();
    } catch {
      setError("ネットワークエラーです。接続を確認してください。");
      setStep("upload");
    }
  }, [image, isGuest, fetchStatus]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setImage(null);
    setResult(null);
    setError(null);
    setScanTriggered(false);
    setAdState("idle");
    setAdUnavailable(false);
    adControllerRef.current?.dispose();
    adControllerRef.current = null;
  }, []);

  // canScan の判定
  const canScan = (() => {
    if (isGuest) {
      return guestTokens !== null && guestTokens > 0;
    }
    if (userStatus) {
      // Premium (tokenBalance === null) は無制限
      if (userStatus.tokenBalance === null) return true;
      // Free: トークン残高チェック
      return userStatus.tokenBalance > 0;
    }
    return false;
  })();

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={step === "scanning"}>
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Hero */}
      {step === "upload" && (
        <div className="flex flex-col items-center gap-1 text-center">
          <Image src="/icon.png" alt="SwimHub Scanner" width={100} height={100} />
          <h1 className="text-3xl font-bold tracking-tight">SwimHub Scanner</h1>
          <p className="text-sm text-muted-foreground">手書きの記録表をAIで解析</p>
        </div>
      )}

      {/* Usage status bar */}
      {!statusLoading && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {isGuest && guestTokens !== null && (
              <>
                お試し残り:{" "}
                <span className="font-bold text-foreground">{guestTokens}</span>回
              </>
            )}
            {!isGuest && userStatus?.plan === "premium" && (
              <span className="font-medium text-purple-600">Premium — 回数無制限</span>
            )}
            {!isGuest && userStatus && userStatus.tokenBalance !== null && (
              <>
                トークン残高:{" "}
                <span className="font-bold text-foreground">
                  {userStatus.tokenBalance}
                </span>
                回
              </>
            )}
          </div>
          {isGuest && (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-blue-600">
                アカウント登録
              </Button>
            </Link>
          )}
          {!isGuest && userStatus?.plan === "free" && (
            <Button variant="ghost" size="sm" className="text-purple-600">
              Premium にアップグレード
            </Button>
          )}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Step 1: 画像アップロード</h2>

          {!canScan && !statusLoading && (
            <div role="alert" className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {isGuest ? (
                <div className="flex flex-col items-center gap-2">
                  <span>無料トークンを使い切りました。</span>
                  <Link href="/login">
                    <Button size="sm">アカウント登録してもっと使う</Button>
                  </Link>
                </div>
              ) : (
                "トークンを使い切りました。Premiumにアップグレードすると無制限でご利用いただけます。"
              )}
            </div>
          )}

          <ImageUploader onImageSelect={handleImageSelect} disabled={!canScan} />

          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={handleScan}
              disabled={!image || !canScan}
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
          <p className="text-lg font-medium text-foreground">画像を解析しています...</p>
          <p className="text-sm text-muted-foreground">AI が手書きのタイム記録表を読み取っています</p>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Step 3: 結果確認・修正</h2>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              新しいスキャン
            </Button>
          </div>

          <ResultTable data={result} onDataChange={setResult} />

          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">出力</h3>
            <ExportButtons data={result} />
          </div>

          {isGuest && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                  アカウント登録してもっと使う
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
