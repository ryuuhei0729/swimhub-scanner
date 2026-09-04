import type { ScanTimesheetResponse, SwimStroke } from "../types/api";

const VALID_STROKES: SwimStroke[] = ["Fr", "Br", "Ba", "Fly", "IM"];

export function validateScanResult(data: unknown): data is ScanTimesheetResponse {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;
  if (!obj.menu || !Array.isArray(obj.swimmers)) return false;

  const menu = obj.menu as Record<string, unknown>;
  if (typeof menu.distance !== "number" || typeof menu.repCount !== "number") return false;
  if (typeof menu.setCount !== "number") return false;

  // OCR が誤読した異常な数値がクライアントの `Array.from({ length: n })` に渡ると
  // クラッシュや意図しない巨大配列生成を招くため、水泳ドメインの実態に基づく上限と
  // 整数性を検証する。
  // 上限値は swim-hub/supabase/functions/scan-timesheet/index.ts と二重管理。
  // 値を変更する場合は両方を揃えること。
  if (!Number.isInteger(menu.distance) || menu.distance < 1 || menu.distance > 4000) return false;
  if (!Number.isInteger(menu.repCount) || menu.repCount < 1 || menu.repCount > 50) return false;
  if (!Number.isInteger(menu.setCount) || menu.setCount < 1 || menu.setCount > 20) return false;

  for (const swimmer of obj.swimmers as unknown[]) {
    const s = swimmer as Record<string, unknown>;
    if (typeof s.no !== "number") return false;
    if (typeof s.name !== "string") return false;
    if (!VALID_STROKES.includes(s.style as SwimStroke)) return false;
    if (!Array.isArray(s.times)) return false;
  }

  return true;
}
