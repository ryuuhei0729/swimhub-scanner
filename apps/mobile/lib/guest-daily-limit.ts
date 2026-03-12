/**
 * ゲストユーザーの日次利用制限（AsyncStorage）
 * Web版 (guest-daily-limit.ts) と同じロジック。
 * JST 0:00 でリセットされる 1回/日 の制限。
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PLAN_LIMITS } from '@swimhub-scanner/shared'

const STORAGE_KEY_PREFIX = 'swimhub_guest_daily_usage'

function getTodayJST(): string {
  const dateStr = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Tokyo',
  })
  return dateStr
}

interface DailyUsage {
  date: string
  count: number
}

function getKey(app: 'scanner' | 'timer'): string {
  return `${STORAGE_KEY_PREFIX}_${app}`
}

async function getUsage(app: 'scanner' | 'timer'): Promise<DailyUsage | null> {
  try {
    const raw = await AsyncStorage.getItem(getKey(app))
    if (!raw) return null
    return JSON.parse(raw) as DailyUsage
  } catch {
    return null
  }
}

/**
 * ゲストが今日スキャンできるか判定する。
 * 今日のスキャン回数 < dailyScanLimit (1) なら true。
 */
export async function canGuestScanToday(app: 'scanner' | 'timer' = 'scanner'): Promise<boolean> {
  const today = getTodayJST()
  const usage = await getUsage(app)
  const limit = PLAN_LIMITS.guest.dailyScanLimit ?? 1
  if (!usage || usage.date !== today) return true
  return usage.count < limit
}

/**
 * ゲストの今日のスキャンを記録（カウントをインクリメント）。
 */
export async function recordGuestScan(app: 'scanner' | 'timer' = 'scanner'): Promise<void> {
  const today = getTodayJST()
  const usage = await getUsage(app)
  if (usage && usage.date === today) {
    usage.count += 1
    await AsyncStorage.setItem(getKey(app), JSON.stringify(usage))
  } else {
    await AsyncStorage.setItem(
      getKey(app),
      JSON.stringify({ date: today, count: 1 }),
    )
  }
}

/**
 * ゲストの今日のスキャン回数を返す。
 */
export async function getGuestTodayCount(app: 'scanner' | 'timer' = 'scanner'): Promise<number> {
  const today = getTodayJST()
  const usage = await getUsage(app)
  if (!usage || usage.date !== today) return 0
  return usage.count
}

/**
 * ゲストの利用データをクリア（アカウント登録後に呼ぶ）。
 */
export async function clearGuestUsage(app: 'scanner' | 'timer' = 'scanner'): Promise<void> {
  await AsyncStorage.removeItem(getKey(app))
}
