"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import SubscriptionSettings from "@/components/settings/SubscriptionSettings";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, loading, refreshSubscription } = useAuth();
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "ja";

  // Checkout 完了後に subscription を再取得
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("session_id")) {
      // Stripe Checkout 完了後 — subscription 情報を最新化
      refreshSubscription();
      // URL から session_id を除去（ブラウザ履歴を汚さない）
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [refreshSubscription]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    router.push(`/${locale}/login`);
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t("settings.title")}</h1>

        {/* アカウント情報 */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 shadow-sm mb-6">
          <div className="pb-2 mb-4 border-b border-border">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t("settings.account")}</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">{t("settings.email")}</span>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
          </div>
        </div>

        {/* サブスクリプション設定 */}
        <SubscriptionSettings />
      </div>
    </div>
  );
}
