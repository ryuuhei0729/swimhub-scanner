"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

interface UpgradeBannerProps {
  tokensRemaining: number | null;
  tokensUsedToday: number;
}

export function UpgradeBanner({ tokensRemaining, tokensUsedToday }: UpgradeBannerProps) {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params.locale as string) || "ja";

  // Premium users (unlimited) or users with remaining tokens don't see the banner
  if (tokensRemaining === null || tokensRemaining > 0) {
    return null;
  }

  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{t("upgrade.limitReached", { count: tokensUsedToday })}</p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-400">
            {t("upgrade.upgradeMessage")}
          </p>
        </div>
        <Link
          href={`/${locale}/settings`}
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          {t("upgrade.upgradeButton")}
        </Link>
      </div>
    </div>
  );
}
