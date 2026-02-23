import type { PlanType } from "./api";

export interface PlanLimits {
  dailyScanLimit: number | null; // null = unlimited
  maxSwimmers: number | null; // null = unlimited
  showAds: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    dailyScanLimit: 1,
    maxSwimmers: 8,
    showAds: true,
  },
  premium: {
    dailyScanLimit: null,
    maxSwimmers: null,
    showAds: false,
  },
} as const;

export const PREMIUM_PRICE_JPY = 1000;
