"use client";

import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  className?: string;
}

/**
 * シンプルなスピナー（既存コードとの後方互換）
 * ScannerFlow, AuthGuard 等で使用
 */
export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary ${className}`}
      role="status"
      aria-label={t("common.loading")}
    />
  );
}

interface LoadingSpinnerWithMessageProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

/**
 * メッセージ付き二重回転スピナー（swim-hub 統一デザイン）
 */
export function LoadingSpinnerWithMessage({
  size = "lg",
  message,
  className = "",
}: LoadingSpinnerWithMessageProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("common.loading");
  return (
    <div
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      role="status"
      aria-label={t("common.loading")}
    >
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin`}
        >
          <div className="absolute top-0 left-0 h-full w-full border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
      {displayMessage && (
        <p className="text-sm text-gray-600 animate-pulse">{displayMessage}</p>
      )}
    </div>
  );
}

/**
 * フルスクリーンローディング（swim-hub 統一デザイン）
 */
export function FullScreenLoading({
  message,
}: {
  message?: string;
}) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("common.loadingApp");
  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinnerWithMessage size="xl" message={displayMessage} />
        <div className="mt-6">
          <div className="w-64 bg-gray-200 rounded-full h-1 overflow-hidden mx-auto">
            <div className="bg-blue-600 h-1 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
