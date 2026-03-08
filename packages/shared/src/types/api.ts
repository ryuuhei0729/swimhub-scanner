// === Scan Timesheet API ===

export interface ScanTimesheetRequest {
  /** Base64-encoded image data */
  image: string;
  /** MIME type of the image */
  mimeType: "image/jpeg" | "image/png";
}

export interface MenuInfo {
  /** Distance per rep in meters */
  distance: number;
  /** Number of reps per set */
  repCount: number;
  /** Number of sets */
  setCount: number;
  /** Circle time in seconds, null if unreadable */
  circle: number | null;
  /** Set description (reference info) */
  description: string;
}

/** Swimming stroke abbreviation */
export type SwimStroke = "Fr" | "Br" | "Ba" | "Fly" | "IM";

export interface SwimmerResult {
  /** Swimmer number */
  no: number;
  /** Swimmer name (empty string if unreadable) */
  name: string;
  /** Stroke abbreviation */
  style: SwimStroke;
  /** Times in seconds, null if unreadable */
  times: (number | null)[];
}

export interface ScanTimesheetResponse {
  menu: MenuInfo;
  swimmers: SwimmerResult[];
}

// === User Status API ===

export interface UserStatusResponse {
  plan: PlanType;
  premiumExpiresAt: string | null; // ISO 8601
  todayScanCount: number;
  dailyLimit: number | null; // null = unlimited
  maxSwimmers: number | null; // null = unlimited
  tokenBalance: number | null; // null = unlimited (premium)
}

// === Error Response ===

export type ErrorCode =
  | "UNAUTHORIZED"
  | "DAILY_LIMIT_EXCEEDED"
  | "TOKEN_EXHAUSTED"
  | "SWIMMER_LIMIT_EXCEEDED"
  | "PARSE_ERROR"
  | "IMAGE_ERROR"
  | "API_ERROR";

export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
}

export type PlanType = "free" | "premium";
