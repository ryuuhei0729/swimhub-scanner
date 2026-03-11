const STORAGE_KEY_PREFIX = "swimhub_guest_daily_usage";

function getTodayJST(): string {
  const dateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo",
  });
  return dateStr;
}

interface DailyUsage {
  date: string;
  count: number;
}

function getKey(app: "scanner" | "timer"): string {
  return `${STORAGE_KEY_PREFIX}_${app}`;
}

function getUsage(app: "scanner" | "timer"): DailyUsage | null {
  try {
    const raw = localStorage.getItem(getKey(app));
    if (!raw) return null;
    return JSON.parse(raw) as DailyUsage;
  } catch {
    return null;
  }
}

export function canGuestUseToday(app: "scanner" | "timer"): boolean {
  const today = getTodayJST();
  const usage = getUsage(app);
  if (!usage || usage.date !== today) return true;
  return usage.count < 1;
}

export function markGuestUsedToday(app: "scanner" | "timer"): void {
  const today = getTodayJST();
  const usage = getUsage(app);
  if (usage && usage.date === today) {
    usage.count += 1;
    localStorage.setItem(getKey(app), JSON.stringify(usage));
  } else {
    localStorage.setItem(
      getKey(app),
      JSON.stringify({ date: today, count: 1 }),
    );
  }
}

export function getGuestTodayCount(app: "scanner" | "timer"): number {
  const today = getTodayJST();
  const usage = getUsage(app);
  if (!usage || usage.date !== today) return 0;
  return usage.count;
}
