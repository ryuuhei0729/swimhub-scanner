"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type {
  ScanTimesheetResponse,
  UserStatusResponse,
  ApiErrorResponse,
} from "@swimhub-scanner/shared";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ImageUploader } from "./ImageUploader";
import { ResultTable } from "./ResultTable";
import { ExportButtons } from "./ExportButtons";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { openTimesheetPrintWindow } from "@/lib/timesheet-print";
import { useAuth } from "@/hooks/useAuth";
import { canGuestUseToday, markGuestUsedToday, getGuestTodayCount } from "@/lib/guest-daily-limit";

type Step = "upload" | "scanning" | "result";

export type { Step };

export function ScannerFlow({ onStepChange }: { onStepChange?: (step: Step) => void }) {
  const { t } = useTranslation();
  const { isGuest, isAuthenticated } = useAuth();
  const params = useParams();
  const locale = (params.locale as string) || "ja";
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<{
    base64: string;
    mimeType: "image/jpeg" | "image/png";
  } | null>(null);
  const [result, setResult] = useState<ScanTimesheetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null);
  const [guestCanUse, setGuestCanUse] = useState<boolean>(true);
  const [guestUsedCount, setGuestUsedCount] = useState<number>(0);
  const [statusLoading, setStatusLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      if (isGuest) {
        setGuestCanUse(canGuestUseToday("scanner"));
        setGuestUsedCount(getGuestTodayCount("scanner"));
        setUserStatus(null);
      } else if (isAuthenticated) {
        const res = await fetch("/api/user/status");
        if (res.ok) {
          setUserStatus(await res.json());
        }
        setGuestCanUse(true);
        setGuestUsedCount(0);
      } else {
        setUserStatus(null);
        setGuestCanUse(true);
        setGuestUsedCount(0);
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

  const handleRefresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  const handleImageSelect = useCallback((base64: string, mimeType: "image/jpeg" | "image/png") => {
    setImage({ base64, mimeType });
    setError(null);
  }, []);

  const handleScan = useCallback(async () => {
    if (!image) return;

    // ゲスト: 日次制限チェック
    if (isGuest) {
      if (!canGuestUseToday("scanner")) {
        setError(
          t("scanner.dailyLimitGuest"),
        );
        return;
      }
    }

    setStep("scanning");
    setError(null);

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
            setError(
              isGuest
                ? t("scanner.dailyLimitGuest")
                : t("scanner.dailyLimitFree"),
            );
            break;
          case "SWIMMER_LIMIT_EXCEEDED":
            setError(t("scanner.swimmerLimitExceeded"));
            break;
          case "PARSE_ERROR":
            setError(
              t("scanner.parseError"),
            );
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

      // ゲスト: スキャン成功時に日次利用を記録
      if (isGuest) {
        markGuestUsedToday("scanner");
      }

      // Refresh user status after scan
      await fetchStatus();
    } catch {
      setError(t("scanner.networkError"));
      setStep("upload");
    }
  }, [image, isGuest, fetchStatus, t]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setImage(null);
    setResult(null);
    setError(null);
  }, []);

  // canScan の判定
  const canScan = (() => {
    if (isGuest) {
      return guestCanUse;
    }
    if (userStatus) {
      return userStatus.canScan;
    }
    return false;
  })();

  const guestRemaining = Math.max(0, 1 - guestUsedCount);

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={step === "scanning"}>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        {/* Hero */}
        {step === "upload" && (
          <div className="flex flex-col items-center gap-1 text-center">
            <Image src="/icon.png" alt="SwimHub Scanner" width={100} height={100} />
            <h1 className="text-3xl font-bold tracking-tight">SwimHub Scanner</h1>
            <p className="text-sm text-muted-foreground">{t("scanner.heroSubtitle")}</p>
          </div>
        )}

        {/* Usage status bar */}
        {!statusLoading && (isGuest || userStatus != null) && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {isGuest && (
                <div className="flex flex-col gap-0.5">
                  <span>
                    {t("scanner.todayRemaining")} <span className="font-bold text-foreground">{guestRemaining}</span>{" "}
                    {t("scanner.perDay")}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {t("scanner.registerForDaily")}
                  </span>
                </div>
              )}
              {!isGuest && userStatus?.plan === "premium" && (
                <span className="font-medium text-foreground">{t("scanner.unlimited")}</span>
              )}
              {!isGuest && userStatus?.plan === "free" && (
                <div className="flex flex-col gap-0.5">
                  <span>
                    {t("scanner.todayRemaining")}{" "}
                    <span className="font-bold text-foreground">
                      {userStatus.remainingScans ?? 0}
                    </span>{" "}
                    {t("scanner.perDay")}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {t("scanner.dailyReset")}
                  </span>
                </div>
              )}
            </div>
            {isGuest && (
              <Link href={`/${locale}/login`}>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  {t("scanner.registerAccount")}
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("scanner.step1Title")}</h2>

            {!canScan && !statusLoading && (
              <div
                role="alert"
                className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800"
              >
                {isGuest ? (
                  <div className="flex flex-col items-center gap-2">
                    <span>
                      {t("scanner.dailyLimitGuest")}
                    </span>
                    <Link href={`/${locale}/login`}>
                      <Button size="sm">{t("scanner.createFreeAccount")}</Button>
                    </Link>
                  </div>
                ) : (
                  t("scanner.dailyLimitFree")
                )}
              </div>
            )}

            <ImageUploader onImageSelect={handleImageSelect} disabled={!canScan} />

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button size="lg" onClick={handleScan} disabled={!image || !canScan}>
                {t("scanner.scan")}
              </Button>
              <Button variant="outline" size="lg" onClick={openTimesheetPrintWindow}>
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
                {t("scanner.printTemplate")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Scanning */}
        {step === "scanning" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-16">
            <LoadingSpinner className="h-12 w-12" />
            <p className="text-lg font-medium text-foreground">{t("scanner.scanning")}</p>
            <p className="text-sm text-muted-foreground">
              {t("scanner.scanningDesc")}
            </p>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("scanner.step3Title")}</h2>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                {t("scanner.newScan")}
              </Button>
            </div>

            <ResultTable data={result} onDataChange={setResult} />

            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t("scanner.output")}</h3>
              <ExportButtons data={result} />
            </div>

            {isGuest && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                <Link href={`/${locale}/login`}>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                    {t("scanner.registerForMore")}
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
