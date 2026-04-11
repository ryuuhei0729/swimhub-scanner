export interface UserDocument {
  plan: "guest" | "free" | "premium";
  premiumExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageDocument {
  scanCount: number;
  lastScanAt: Date;
}
