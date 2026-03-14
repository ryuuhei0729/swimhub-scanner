"use client";

interface UpgradeBannerProps {
  tokensRemaining: number | null;
  tokensUsedToday: number;
}

const SWIMHUB_URL = process.env.NEXT_PUBLIC_SWIMHUB_URL ?? "https://swim-hub.app";

export function UpgradeBanner({ tokensRemaining, tokensUsedToday }: UpgradeBannerProps) {
  // Premium users (unlimited) or users with remaining tokens don't see the banner
  if (tokensRemaining === null || tokensRemaining > 0) {
    return null;
  }

  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">今日の利用回数に達しました（{tokensUsedToday}回使用済み）</p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-400">
            Premium にアップグレードして無制限にスキャンしましょう
          </p>
        </div>
        <a
          href={`${SWIMHUB_URL}/settings`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          アップグレード
        </a>
      </div>
    </div>
  );
}
