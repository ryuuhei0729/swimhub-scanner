import type { PlanType } from "./api";

export interface PlanLimits {
  dailyScanLimit: number | null; // null = unlimited
  maxSwimmers: number | null; // null = unlimited
  showAds: boolean;
  useTokens: boolean; // true = token-based limit instead of daily limit
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    dailyScanLimit: 1,
    maxSwimmers: 8,
    showAds: true,
    useTokens: true,
  },
  premium: {
    dailyScanLimit: null,
    maxSwimmers: null,
    showAds: false,
    useTokens: false,
  },
} as const;

export const GUEST_INITIAL_TOKENS = 3;

export const PREMIUM_PRICE_JPY = 1000;
