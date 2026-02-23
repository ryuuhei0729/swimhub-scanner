import type { ScanTimesheetResponse, SwimStroke } from "../types/api";

const VALID_STROKES: SwimStroke[] = ["Fr", "Br", "Ba", "Fly", "IM"];

export function validateScanResult(data: unknown): data is ScanTimesheetResponse {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;
  if (!obj.menu || !Array.isArray(obj.swimmers)) return false;

  const menu = obj.menu as Record<string, unknown>;
  if (typeof menu.distance !== "number" || typeof menu.repCount !== "number") return false;
  if (typeof menu.setCount !== "number") return false;

  for (const swimmer of obj.swimmers as unknown[]) {
    const s = swimmer as Record<string, unknown>;
    if (typeof s.no !== "number") return false;
    if (typeof s.name !== "string") return false;
    if (!VALID_STROKES.includes(s.style as SwimStroke)) return false;
    if (!Array.isArray(s.times)) return false;
  }

  return true;
}
