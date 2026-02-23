import "server-only";
import { getTodayJST } from "@swimhub-scanner/shared/utils";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types";
import type { PlanType, UsageDocument } from "@swimhub-scanner/shared";

/**
 * Get today's scan count for a user.
 */
export async function getTodayScanCount(uid: string): Promise<number> {
  // Mock mode
  if (process.env.NODE_ENV === "development" && process.env.FIREBASE_PROJECT_ID === "mock") {
    return 0;
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  const today = getTodayJST();
  const usageRef = adminDb.collection("users").doc(uid).collection("usage").doc(today);
  const usageDoc = await usageRef.get();

  if (!usageDoc.exists) {
    return 0;
  }

  const data = usageDoc.data() as UsageDocument;
  return data.scanCount;
}

/**
 * Check if a user can scan (has not exceeded daily limit).
 */
export async function canUserScan(uid: string, plan: PlanType): Promise<boolean> {
  const limits = PLAN_LIMITS[plan];
  if (limits.dailyScanLimit === null) {
    return true;
  }

  const count = await getTodayScanCount(uid);
  return count < limits.dailyScanLimit;
}

/**
 * Increment the scan count for today.
 */
export async function incrementScanCount(uid: string): Promise<void> {
  // Mock mode
  if (process.env.NODE_ENV === "development" && process.env.FIREBASE_PROJECT_ID === "mock") {
    console.log("[DEV] Mock: incrementScanCount for", uid);
    return;
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  const today = getTodayJST();
  const usageRef = adminDb.collection("users").doc(uid).collection("usage").doc(today);
  const usageDoc = await usageRef.get();

  if (usageDoc.exists) {
    await usageRef.update({
      scanCount: (usageDoc.data() as UsageDocument).scanCount + 1,
      lastScanAt: new Date(),
    });
  } else {
    const newUsage: UsageDocument = {
      scanCount: 1,
      lastScanAt: new Date(),
    };
    await usageRef.set(newUsage);
  }
}
