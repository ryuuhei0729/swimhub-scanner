/**
 * Convert a raw digit string to seconds.
 * Handles "364" -> 36.4, "1052" -> 105.2
 */
export function rawStringToSeconds(rawStr: string): number | null {
  const cleaned = rawStr.replace(/\s/g, "");
  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num < 0) return null;
  return num / 10;
}

/**
 * Format seconds to display string.
 * e.g., 36.4 -> "36.40", 65.2 -> "1:05.20"
 *
 * CLAUDE.md の表示規約（分:秒.コンマ秒＝小数第2位）に合わせて2桁表示にしているが、
 * 元データは Gemini OCR (apps/web/src/lib/gemini/prompt.ts) が読み取る手書き
 * タイムシートの 1/10 秒精度でしかない。小数第2位は測定精度ではなくゼロ埋め。
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return seconds.toFixed(2);
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

/**
 * Calculate average of non-null times.
 */
export function averageTime(times: (number | null)[]): number | null {
  const valid = times.filter((t): t is number => t !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

/**
 * Find the fastest (minimum) time.
 */
export function fastestTime(times: (number | null)[]): number | null {
  const valid = times.filter((t): t is number => t !== null);
  if (valid.length === 0) return null;
  return Math.min(...valid);
}

/**
 * Find the slowest (maximum) time.
 */
export function slowestTime(times: (number | null)[]): number | null {
  const valid = times.filter((t): t is number => t !== null);
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

/**
 * Parse a displayed time string back into seconds.
 * Accepts both the "m:ss.s" format (e.g. "1:05.2") and the plain "ss.s"
 * format (e.g. "36.4") used when the time is under a minute.
 * Returns null for empty, negative, or otherwise invalid input instead of
 * silently truncating it (unlike `parseFloat`, which would parse "1:05.2" as 1).
 */
export function parseDisplayTime(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length !== 2) return null;
    const [minutesPart, secondsPart] = parts as [string, string];
    if (!/^\d+$/.test(minutesPart) || !/^\d+(\.\d+)?$/.test(secondsPart)) return null;
    const minutes = parseInt(minutesPart, 10);
    const seconds = parseFloat(secondsPart);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    return minutes * 60 + seconds;
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const seconds = parseFloat(trimmed);
  if (isNaN(seconds)) return null;
  return seconds;
}

/**
 * Format circle time in minutes/seconds notation.
 * e.g., 60 -> 1'00", 130 -> 2'10", 45 -> 45"
 */
export function formatCircleTime(seconds: number): string {
  if (seconds < 60) return `${seconds}"`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}'${secs.toString().padStart(2, "0")}"`;
}
