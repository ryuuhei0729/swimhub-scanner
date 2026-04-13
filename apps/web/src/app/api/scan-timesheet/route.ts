import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyAuth, ensureUserDocument } from "@/lib/api-helpers";
import { canUserScan, incrementScanCount, logTokenConsumption } from "@/lib/supabase/usage";
import { scanTimesheetWithGemini } from "@/lib/gemini/client";
import { validateImageMimeType, validateImageSize, estimateBase64Size } from "@swimhub-scanner/shared/validation/image";
import { validateScanResult } from "@swimhub-scanner/shared/validation/scan-result";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types/plan";
import type { ScanTimesheetRequest, ScanTimesheetResponse, ApiErrorResponse } from "@swimhub-scanner/shared/types/api";
import { getClientIp } from "@/lib/client-ip";
import { reserveGuestScan, rollbackGuestScanCount } from "@/lib/rate-limit";

/**
 * ゲストリクエストかどうか判定
 */
function isGuestRequest(request: NextRequest): boolean {
  return request.headers.get("X-Guest-Mode") === "true";
}

/**
 * 共通のスキャン処理（画像バリデーション → Gemini → レスポンス）
 */
async function performScan(
  body: ScanTimesheetRequest,
  maxSwimmers: number | null,
): Promise<NextResponse<ScanTimesheetResponse | ApiErrorResponse>> {
  // Validate image
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

  // Call Gemini API (with 1 retry)
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

  // Parse and validate Gemini response
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

  // Swimmer count check
  if (maxSwimmers !== null && parsed.swimmers.length > maxSwimmers) {
    return NextResponse.json<ApiErrorResponse>(
      {
        error: `無料プランでは${maxSwimmers}名まで解析可能です`,
        code: "SWIMMER_LIMIT_EXCEEDED",
      },
      { status: 400 },
    );
  }

  return NextResponse.json<ScanTimesheetResponse>(parsed);
}

export async function POST(request: NextRequest) {
  // === ゲストモード ===
  if (isGuestRequest(request)) {
    // IP ベースのレート制限 (KV による サーバーサイド強制)
    const ip = getClientIp(request);
    const { env } = await getCloudflareContext({ async: true });
    const kv = env.RATE_LIMIT_KV;

    if (!kv) {
      console.error("RATE_LIMIT_KV binding is not configured");
      return NextResponse.json<ApiErrorResponse>(
        { error: "サーバー設定エラーが発生しました", code: "API_ERROR" },
        { status: 500 },
      );
    }

    const { allowed } = await reserveGuestScan(kv, ip);
    if (!allowed) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "本日の無料利用回数に達しました。アカウント登録で利用回数が増えます。",
          code: "DAILY_LIMIT_EXCEEDED",
        },
        { status: 429 },
      );
    }

    let body: ScanTimesheetRequest;
    try {
      body = await request.json();
    } catch {
      await rollbackGuestScanCount(kv, ip);
      return NextResponse.json<ApiErrorResponse>(
        { error: "リクエストの形式が不正です", code: "IMAGE_ERROR" },
        { status: 400 },
      );
    }

    // ゲストはguestプランの制限を適用（選手数上限）
    const maxSwimmers = PLAN_LIMITS.guest.maxSwimmers;
    const result = await performScan(body, maxSwimmers);

    // スキャン失敗時はカウントをロールバック
    if (result.status !== 200) {
      await rollbackGuestScanCount(kv, ip);
    }

    return result;
  }

  // === 認証済みユーザー ===
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const {
    auth: { uid },
    supabase,
  } = authResult.result;

  // Get user document (auto-create on first login)
  const userDoc = await ensureUserDocument(supabase, uid);

  // Parse request body
  let body: ScanTimesheetRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "リクエストの形式が不正です", code: "IMAGE_ERROR" },
      { status: 400 },
    );
  }

  // サブスクリプションステータスを取得
  const { data: subData } = await supabase
    .from("user_subscriptions")
    .select("status")
    .eq("id", uid)
    .single();
  const subscriptionStatus = subData?.status ?? null;

  // 日次制限チェック
  const planLimits = PLAN_LIMITS[userDoc.plan];
  const canScan = await canUserScan(supabase, uid, userDoc.plan, subscriptionStatus, userDoc.premiumExpiresAt);
  if (!canScan) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "今日の利用回数に達しました", code: "DAILY_LIMIT_EXCEEDED" },
      { status: 429 },
    );
  }

  // Premium は maxSwimmers 制限なし
  const isPremium = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const maxSwimmers = isPremium ? null : planLimits.maxSwimmers;

  const result = await performScan(body, maxSwimmers);

  // スキャン成功時のみ使用回数記録
  if (result.status === 200) {
    await incrementScanCount(supabase, uid);
    // Premium 以外はトークン消費ログを記録
    if (!isPremium) {
      await logTokenConsumption(supabase, uid, "scanner_scan");
    }
  }

  return result;
}
