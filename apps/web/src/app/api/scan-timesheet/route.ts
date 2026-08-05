import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, ensureUserDocument } from "@/lib/api-helpers";
import { reserveUserScan, releaseUserScan, logTokenConsumption } from "@/lib/supabase/usage";
import { scanTimesheetWithGemini } from "@/lib/gemini/client";
import { validateImageMimeType, validateImageSize, estimateBase64Size } from "@swimhub-scanner/shared/validation/image";
import { validateScanResult } from "@swimhub-scanner/shared/validation/scan-result";
import { PLAN_LIMITS } from "@swimhub-scanner/shared/types/plan";
import type { ScanTimesheetRequest, ScanTimesheetResponse, ApiErrorResponse } from "@swimhub-scanner/shared/types/api";
import { getClientIp } from "@/lib/client-ip";
import { reserveGuestScan, rollbackGuestScanCount } from "@/lib/rate-limit";

/**
 * クライアントが X-Guest-Mode: true を要求しているか
 * (これ単体では信頼境界にしない。認証が実際に成立したかどうかと組み合わせて判定する)
 */
function isGuestModeRequested(request: NextRequest): boolean {
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

/**
 * ゲスト経路: IP ベースのレート制限
 *
 * Postgres の reserve_guest_scan RPC (service_role 限定) で単一 SQL 文により
 * 原子的に予約する。詳細は lib/rate-limit.ts のコメント参照。
 */
async function handleGuestScan(
  request: NextRequest,
): Promise<NextResponse<ScanTimesheetResponse | ApiErrorResponse>> {
  const ip = getClientIp(request);

  const { allowed } = await reserveGuestScan(ip);
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
    await rollbackGuestScanCount(ip);
    return NextResponse.json<ApiErrorResponse>(
      { error: "リクエストの形式が不正です", code: "IMAGE_ERROR" },
      { status: 400 },
    );
  }

  // ゲストはguestプランの制限を適用（選手数上限）
  const maxSwimmers = PLAN_LIMITS.guest.maxSwimmers;
  const result = await performScan(body, maxSwimmers);

  // スキャン失敗時はカウントをロールバック (この呼び出し1箇所のみ = 冪等)
  if (result.status !== 200) {
    await rollbackGuestScanCount(ip);
  }

  return result;
}

export async function POST(request: NextRequest) {
  // 信頼境界は「クライアントが自称するモード (X-Guest-Mode ヘッダー)」でも
  // 「Authorization ヘッダーの有無」でもなく、「認証が実際に成立したか」に置く。
  //
  // verifyAuth は Bearer トークン (mobile) と Cookie セッション (web) の両方を
  // カバーする (apps/web/src/lib/api-helpers.ts)。web クライアントは
  // Authorization ヘッダーを送らず Cookie のみで認証されるため、
  // 「Authorization ヘッダーの有無」を境界にすると、ログイン済み web ユーザーが
  // X-Guest-Mode: true を1つ足すだけでアカウント単位の日次クォータを回避できて
  // しまう (C-2)。そのため X-Guest-Mode の値に関わらず必ず verifyAuth を先に
  // 試み、その成否のみで分岐する。
  //
  //   - 認証が成立した (Bearer/Cookie いずれでも) → X-Guest-Mode の値に関わらず
  //     必ず認証済み経路 (アカウント単位の日次利用量を必ず消費させる)。
  //   - 認証が成立しなかった (トークン無し/無効/期限切れ/Cookie無し等) →
  //     X-Guest-Mode: true であればゲスト経路にフォールバックできる。
  //     そうでなければ従来どおり認証エラーを返す。
  const guestModeRequested = isGuestModeRequested(request);
  const authResult = await verifyAuth(request);

  if ("error" in authResult) {
    if (guestModeRequested) {
      return handleGuestScan(request);
    }
    return authResult.error;
  }

  // === 認証済みユーザー (Bearer/Cookie のいずれで成立した場合も必ずこちら) ===
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

  // 無料枠を原子的に予約する (Gemini 呼び出しの前)。
  // C-4: 読み取り→Gemini呼び出し→加算という従来の構造では、読み取りと加算の間の
  // 競合窓で同一ユーザーの同時リクエストが両方「まだ枠がある」と判定できてしまう。
  // reserveUserScan は service_role 限定の RPC 経由で Premium 判定 (関数内部で
  // 導出。checkIsPremium() と同一ロジック) と使用量加算を1トランザクションで
  // 直列化するため、この競合窓が閉じる。失敗時は releaseUserScan で解放する。
  const reserveResult = await reserveUserScan(uid);
  if (!reserveResult.allowed) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "今日の利用回数に達しました", code: "DAILY_LIMIT_EXCEEDED" },
      { status: 429 },
    );
  }

  // Premium は maxSwimmers 制限なし。isPremium は reserveUserScan (checkIsPremium
  // と同一ロジック) の判定結果を単一の情報源として使う。
  const planLimits = PLAN_LIMITS[userDoc.plan];
  const isPremium = reserveResult.isPremium;
  const maxSwimmers = isPremium ? null : planLimits.maxSwimmers;

  // 予約成功後のあらゆる離脱経路 (performScan 失敗・想定外の例外) で、原子的に
  // 予約した枠を解放する。scanSucceeded は成功レスポンスを返す直前にのみ true に
  // するため、finally はそれ以外の全ての return / throw で解放を実行する
  // (supabase/functions/scan-timesheet/index.ts と同じ try/finally パターン)。
  // released フラグで releaseUserScan の呼び出しを高々1回に限定する (二重解放は
  // 実質的な無料枠拡大になるため避ける)。
  let scanSucceeded = false;
  let released = false;
  const releaseReservation = async () => {
    if (released) return;
    released = true;
    await releaseUserScan(uid);
  };

  try {
    const result = await performScan(body, maxSwimmers);

    if (result.status === 200) {
      scanSucceeded = true;
      // Premium 以外はトークン消費ログ (監査用) を記録する。使用量そのものは
      // reserveUserScan が既に記録済みのため、このログ insert が失敗しても
      // クォータ判定には影響しない (握りつぶさずログのみ残す)。
      if (!isPremium) {
        try {
          await logTokenConsumption(supabase, uid, "scanner_scan");
        } catch (logError) {
          console.error("token_consumption_log の記録に失敗しました:", logError);
        }
      }
    }

    return result;
  } finally {
    if (!scanSucceeded) {
      await releaseReservation();
    }
  }
}
