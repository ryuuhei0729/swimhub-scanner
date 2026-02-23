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
 * e.g., 36.4 -> "36.4", 65.2 -> "1:05.2"
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return seconds.toFixed(1);
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
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
