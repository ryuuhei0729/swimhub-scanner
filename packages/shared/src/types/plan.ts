import type { PlanType } from "./api";

export interface PlanLimits {
  dailyScanLimit: number | null; // null = unlimited
  maxSwimmers: number | null; // null = unlimited
  showAds: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  guest: {
    dailyScanLimit: 1,
    maxSwimmers: 6,
    showAds: true,
  },
  free: {
    dailyScanLimit: 1,
    maxSwimmers: null,
    showAds: true,
  },
  premium: {
    dailyScanLimit: null,
    maxSwimmers: null,
    showAds: false,
  },
} as const;
