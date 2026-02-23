import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, ensureUserDocument } from "@/lib/api-helpers";
import { canUserScan, incrementScanCount } from "@/lib/firebase/usage";
import { scanTimesheetWithGemini } from "@/lib/gemini/client";
import {
  validateImageMimeType,
  validateImageSize,
  estimateBase64Size,
  validateScanResult,
  PLAN_LIMITS,
} from "@swimhub-scanner/shared";
import type {
  ScanTimesheetRequest,
  ScanTimesheetResponse,
  ApiErrorResponse,
} from "@swimhub-scanner/shared";

export async function POST(request: NextRequest) {
  // 1. Auth check
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const { uid } = authResult.auth;

  // 2. Get user document (auto-create on first login)
  const userDoc = await ensureUserDocument(uid);

  // 3. Parse request body
  let body: ScanTimesheetRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "リクエストの形式が不正です", code: "IMAGE_ERROR" },
      { status: 400 },
    );
  }

  // 4. Validate image
  const mimeCheck = validateImageMimeType(body.mimeType);
  if (!mimeCheck.valid) {
    return NextResponse.json<ApiErrorResponse>(
      { error: mimeCheck.error!, code: "IMAGE_ERROR" },
      { status: 400 },
    );
  }

  const sizeBytes = estimateBase64Size(body.image);
  const sizeCheck = validateImageSize(sizeBytes);
  if (!sizeCheck.valid) {
    return NextResponse.json<ApiErrorResponse>(
      { error: sizeCheck.error!, code: "IMAGE_ERROR" },
      { status: 400 },
    );
  }

  // 5. Usage count check
  const allowed = await canUserScan(uid, userDoc.plan);
  if (!allowed) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "本日の利用回数上限に達しました", code: "DAILY_LIMIT_EXCEEDED" },
      { status: 429 },
    );
  }

  // 6. Call Gemini API (with 1 retry)
  let rawJson: string;
  try {
    rawJson = await scanTimesheetWithGemini({
      imageBase64: body.image,
      mimeType: body.mimeType,
    });
  } catch (firstError) {
    try {
      rawJson = await scanTimesheetWithGemini({
        imageBase64: body.image,
        mimeType: body.mimeType,
      });
    } catch {
      console.error("Gemini API failed after retry:", firstError);
      return NextResponse.json<ApiErrorResponse>(
        { error: "サーバーエラーが発生しました", code: "API_ERROR" },
        { status: 500 },
      );
    }
  }

  // 7. Parse and validate Gemini response
  let parsed: ScanTimesheetResponse;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "AI解析結果のパースに失敗しました", code: "PARSE_ERROR" },
      { status: 500 },
    );
  }

  if (!validateScanResult(parsed)) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "AI解析結果の形式が不正です", code: "PARSE_ERROR" },
      { status: 500 },
    );
  }

  // 8. Swimmer count check (after parsing)
  const maxSwimmers = PLAN_LIMITS[userDoc.plan].maxSwimmers;
  if (maxSwimmers !== null && parsed.swimmers.length > maxSwimmers) {
    return NextResponse.json<ApiErrorResponse>(
      {
        error: `無料プランでは${maxSwimmers}名まで解析可能です`,
        code: "SWIMMER_LIMIT_EXCEEDED",
      },
      { status: 400 },
    );
  }

  // 9. Increment usage count
  await incrementScanCount(uid);

  // 10. Return result
  return NextResponse.json<ScanTimesheetResponse>(parsed);
}
