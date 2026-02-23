const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"] as const;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageMimeType(mimeType: string): ImageValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: "JPEG または PNG 形式の画像をアップロードしてください",
    };
  }
  return { valid: true };
}

export function validateImageSize(sizeBytes: number): ImageValidationResult {
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: "画像サイズは10MB以下にしてください",
    };
  }
  return { valid: true };
}

/**
 * Estimate the size of a base64-encoded image in bytes.
 */
export function estimateBase64Size(base64: string): number {
  const cleaned = base64.includes(",") ? base64.split(",")[1]! : base64;
  return Math.ceil((cleaned.length * 3) / 4);
}
