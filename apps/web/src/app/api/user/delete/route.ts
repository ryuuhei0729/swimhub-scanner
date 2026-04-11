import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import type { ApiErrorResponse } from "@swimhub-scanner/shared/types/api";

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

    // Delete user's usage data
    await adminClient.from("app_daily_usage").delete().eq("user_id", uid);

    // Delete user's subscription data
    await adminClient.from("user_subscriptions").delete().eq("id", uid);

    // Delete the Supabase auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);

    if (deleteError) {
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
