"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import PricingCard from "@/components/settings/PricingCard";

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? "";
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ?? "";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;
}

function getTrialDaysRemaining(trialEnd: string | null | undefined): number | null {
  if (!trialEnd) return null;
  const end = new Date(trialEnd);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
}

export default function SubscriptionSettings() {
  const { t } = useTranslation();
  const { subscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PREMIUM_FEATURES = [
    t("subscription.featureUnlimitedScan"),
    t("subscription.featureNoAds"),
    t("subscription.featureFreeTrial"),
  ];

  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? null;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd ?? false;
  const premiumExpiresAt = subscription?.premiumExpiresAt ?? null;
  const trialEnd = subscription?.trialEnd ?? null;

  const isPremium = plan === "premium";
  const isTrialing = status === "trialing";
  const isActive = status === "active";

  const handleCheckout = useCallback(async (priceId: string, interval: "monthly" | "yearly") => {
    setLoadingPlan(interval);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error || t("subscription.checkoutError"));
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoadingPlan(null);
    }
  }, [t]);

  const handleManagePlan = useCallback(async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error || t("subscription.portalError"));
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setPortalLoading(false);
    }
  }, [t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleManagePlan();
    }
  };

  const trialDaysRemaining = getTrialDaysRemaining(trialEnd);

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 pb-2 mb-4 border-b border-border">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t("subscription.title")}</h2>
      </div>

      {/* 現在のプラン表示 */}
      <div className="mb-4">
        {isTrialing ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">{t("subscription.currentPlan")}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {t("subscription.trialing")}
              </span>
            </div>
            {trialDaysRemaining !== null && (
              <p className="text-sm text-muted-foreground">
                {t("subscription.trialRemaining", { days: trialDaysRemaining, date: formatDate(trialEnd) })}
              </p>
            )}
          </div>
        ) : isPremium && isActive ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">{t("subscription.currentPlan")}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {t("subscription.premium")}
              </span>
            </div>
            {premiumExpiresAt && (
              <p className="text-sm text-muted-foreground">{t("subscription.nextRenewal", { date: formatDate(premiumExpiresAt) })}</p>
            )}
            {cancelAtPeriodEnd && (
              <p className="text-sm text-amber-600 mt-1">
                {t("subscription.cancelScheduled")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{t("subscription.currentPlan")}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
              {t("subscription.free")}
            </span>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Free ユーザー: PricingCard 表示 */}
      {!isPremium && !isTrialing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PricingCard
            title={t("subscription.monthlyPlan")}
            price={t("subscription.monthlyPrice")}
            period={t("subscription.monthlyPeriod")}
            features={PREMIUM_FEATURES}
            onSelect={() => handleCheckout(MONTHLY_PRICE_ID, "monthly")}
            isLoading={loadingPlan === "monthly"}
            isCurrentPlan={false}
          />
          <PricingCard
            title={t("subscription.yearlyPlan")}
            price={t("subscription.yearlyPrice")}
            period={t("subscription.yearlyPeriod")}
            badge={t("subscription.yearlyBadge")}
            features={PREMIUM_FEATURES}
            onSelect={() => handleCheckout(YEARLY_PRICE_ID, "yearly")}
            isLoading={loadingPlan === "yearly"}
            isCurrentPlan={false}
          />
        </div>
      )}

      {/* Premium / Trialing ユーザー: 管理ボタン */}
      {(isPremium || isTrialing) && (
        <button
          type="button"
          onClick={handleManagePlan}
          onKeyDown={handleKeyDown}
          disabled={portalLoading}
          aria-label={t("subscription.managePlan")}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {portalLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t("common.processing")}
            </>
          ) : (
            t("subscription.managePlan")
          )}
        </button>
      )}
    </div>
  );
}
