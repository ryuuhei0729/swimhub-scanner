import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-helpers";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const authResult = await verifyAuth(request);
    if ("error" in authResult) {
      return authResult.error;
    }
    const {
      auth: { uid },
    } = authResult.result;

    // 2. Stripe Customer を検索
    const stripe = getStripe();

    const existingCustomers = await stripe.customers.search({
      query: `metadata["supabase_user_id"]:"${uid}"`,
    });

    const firstCustomer = existingCustomers.data[0];
    if (existingCustomers.data.length === 0 || !firstCustomer) {
      return NextResponse.json({ error: "Stripe の顧客情報が見つかりません" }, { status: 404 });
    }

    const customerId = firstCustomer.id;

    // 3. Customer Portal Session 作成
    const origin = new URL(request.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/ja/settings`,
    });

    // 4. session.url を返却
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Portal エラー:", error);
    return NextResponse.json({ error: "ポータルセッションの作成に失敗しました" }, { status: 500 });
  }
}
