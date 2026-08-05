import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import type { ApiErrorResponse } from "@swimhub-scanner/shared/types/api";

const DELETE_STORAGE_MAX_ATTEMPTS = 3;
const DELETE_STORAGE_RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * auth.admin.deleteUser() が「ユーザーが既に存在しない」ことを理由に失敗したかを判定する。
 *
 * GoTrue (Supabase Auth) はこの場合 HTTP 404 + code "user_not_found" を返す
 * (@supabase/auth-js の AuthApiError#status / #code)。同一ユーザーへの2重送信
 * (二重クリック・複数アプリからのほぼ同時退会) で2回目以降のリクエストがこれに該当する。
 * 削除の目的は「ユーザーが存在しないこと」であり、既に存在しないなら目的は達成済みのため、
 * これは失敗ではなく成功として扱う。メッセージの部分一致ではなく status/code で判定する
 * (メッセージ文言はローカライズ・バージョンで変わり得るため)。
 */
function isUserAlreadyDeletedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { status, code } = error as { status?: unknown; code?: unknown };
  return status === 404 && code === "user_not_found";
}

/**
 * delete-user-storage Edge Function を呼び出す (指数バックオフで最大3回試行)。
 *
 * swim-hub / swimhub-timer と同じ Supabase プロジェクトを共有しており、
 * どのアプリから退会しても画像・動画ストレージを確実に削除する必要がある。
 * 最終的に失敗した場合は呼び出し元で auth.admin.deleteUser() を呼ばせず、
 * 「アカウントは消えたのにファイルが残る」孤児ストレージを防ぐ。
 * リトライ間隔は 500ms → 1000ms → 2000ms (3回試行)。
 */
async function invokeDeleteUserStorageWithRetry(
  adminClient: SupabaseClient,
  userId: string,
): Promise<{ success: boolean; errors?: string[] }> {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= DELETE_STORAGE_MAX_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await adminClient.functions.invoke<{
        success: boolean;
        errors?: string[];
      }>("delete-user-storage", { body: { userId } });

      if (!error && data?.success) {
        return { success: true };
      }

      lastError = error ? error.message : JSON.stringify(data?.errors ?? data ?? "unknown error");
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < DELETE_STORAGE_MAX_ATTEMPTS) {
      await sleep(DELETE_STORAGE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  return { success: false, errors: lastError ? [lastError] : ["unknown error"] };
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const {
    auth: { uid },
  } = authResult.result;

  try {
    const adminClient = createAdminClient();

    // ストレージ（画像・動画）削除。失敗したら中断し、孤児ストレージを防ぐ。
    // DB レコード削除より先に行う: 逆順だとストレージ削除の失敗時に
    // 利用状況・購読データだけが失われ、アカウントは残るという不整合な状態になる。
    const storageResult = await invokeDeleteUserStorageWithRetry(adminClient, uid);
    if (!storageResult.success) {
      console.error("Storage deletion error (failed after retries):", storageResult.errors);
      return NextResponse.json<ApiErrorResponse>(
        { error: "ストレージの削除に失敗しました。時間をおいて再度お試しください", code: "API_ERROR" },
        { status: 500 },
      );
    }

    // Delete user's usage data
    await adminClient.from("app_daily_usage").delete().eq("user_id", uid);

    // Delete user's subscription data
    await adminClient.from("user_subscriptions").delete().eq("id", uid);

    // Delete the Supabase auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);

    if (deleteError && !isUserAlreadyDeletedError(deleteError)) {
      console.error("User deletion error:", deleteError);
      return NextResponse.json<ApiErrorResponse>(
        { error: "アカウントの削除に失敗しました", code: "API_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json<ApiErrorResponse>(
      { error: "サーバーエラーが発生しました", code: "API_ERROR" },
      { status: 500 },
    );
  }
}
