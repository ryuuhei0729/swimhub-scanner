import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, ensureUserDocument } from "@/lib/api-helpers";
import { addTokens, getTokenBalance } from "@/lib/supabase/tokens";
import type { ApiErrorResponse } from "@swimhub-scanner/shared";

interface MigrateTokensRequest {
  guestTokensRemaining: number;
}

/**
 * ゲストからアカウント登録した際にローカルのトークン残高をサーバーに引き継ぐ。
 * 既にサーバー側にトークンがある場合（= 初期配布済み）は追加しない。
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const { auth: { uid }, supabase } = authResult.result;

  // ユーザードキュメントを確保
  await ensureUserDocument(supabase, uid);

  let body: MigrateTokensRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "リクエストの形式が不正です", code: "API_ERROR" },
      { status: 400 },
    );
  }

  const { guestTokensRemaining } = body;
  if (typeof guestTokensRemaining !== "number" || guestTokensRemaining < 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "無効なトークン数です", code: "API_ERROR" },
      { status: 400 },
    );
  }

  // サーバー側の現在の残高を確認（getTokenBalanceは初回作成もする）
  const currentBalance = await getTokenBalance(supabase, uid);

  // ゲストの残りトークンが、サーバー初期値より少ない場合
  // → ゲストで使った分を差し引いた値に設定
  // （サーバー側が既に初期配布されているので、重複加算しない）
  if (guestTokensRemaining < currentBalance) {
    // ゲストで使った分だけ減らす
    const tokensUsed = currentBalance - guestTokensRemaining;
    if (tokensUsed > 0) {
      // 残高をゲスト残高に合わせる
      await supabase
        .from("user_tokens")
        .update({
          balance: guestTokensRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid);
    }
  }

  return NextResponse.json({ success: true, balance: guestTokensRemaining });
}
