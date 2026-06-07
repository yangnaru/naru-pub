import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import { assertJsonContentType } from "@/lib/utils";
import {
  BillingInterval,
  chargeBillingKey,
  issueBillingKey,
  newOrderId,
  PLAN_ORDER_NAMES,
  TossApiError,
} from "@/lib/toss";
import { applySuccessfulCharge } from "@/lib/subscriptions";

// Step 2 of the subscribe flow: exchanges the authKey for a billing key and
// charges the first period. Amount comes from the stored subscription (server
// authoritative), never from the client.
export async function POST(request: NextRequest) {
  try {
    try {
      assertJsonContentType(request);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid content type" },
        { status: 400 }
      );
    }

    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { authKey, customerKey } = await request.json();
    if (typeof authKey !== "string" || typeof customerKey !== "string") {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 요청입니다." },
        { status: 400 }
      );
    }

    // The customerKey must belong to this user.
    const userRow = await db
      .selectFrom("users")
      .select("toss_customer_key")
      .where("id", "=", user.id)
      .executeTakeFirst();
    if (!userRow?.toss_customer_key || userRow.toss_customer_key !== customerKey) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 요청입니다." },
        { status: 403 }
      );
    }

    const sub = await db
      .selectFrom("subscriptions")
      .select(["id", "billing_interval", "amount", "status"])
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    if (!sub) {
      return NextResponse.json(
        { success: false, message: "후원 정보를 찾을 수 없습니다." },
        { status: 400 }
      );
    }
    if (sub.status === "active") {
      return NextResponse.json({ success: true, message: "이미 후원 중입니다." });
    }

    const interval = sub.billing_interval as BillingInterval;

    // Issue a reusable billing key from the one-time authKey.
    const { billingKey } = await issueBillingKey(authKey, customerKey);
    await db
      .updateTable("subscriptions")
      .set({ toss_billing_key: billingKey, updated_at: new Date() })
      .where("id", "=", sub.id)
      .execute();

    // Charge the first period.
    const orderId = newOrderId();
    let payment;
    try {
      payment = await chargeBillingKey({
        billingKey,
        customerKey,
        amount: sub.amount,
        orderId,
        orderName: PLAN_ORDER_NAMES[interval],
      });
    } catch (err) {
      await db
        .insertInto("payments")
        .values({
          user_id: user.id,
          subscription_id: sub.id,
          order_id: orderId,
          amount: sub.amount,
          status: "failed",
          raw: JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          }),
        })
        .execute();
      const message =
        err instanceof TossApiError ? err.message : "결제에 실패했습니다.";
      return NextResponse.json({ success: false, message }, { status: 402 });
    }

    if (payment.status !== "DONE") {
      await db
        .insertInto("payments")
        .values({
          user_id: user.id,
          subscription_id: sub.id,
          toss_payment_key: payment.paymentKey,
          order_id: payment.orderId ?? orderId,
          amount: sub.amount,
          status: "failed",
          raw: JSON.stringify(payment),
        })
        .execute();
      return NextResponse.json(
        { success: false, message: "결제가 완료되지 않았습니다." },
        { status: 402 }
      );
    }

    await applySuccessfulCharge({
      subscriptionId: sub.id,
      userId: user.id,
      interval,
      amount: sub.amount,
      from: new Date(),
      payment,
    });

    return NextResponse.json({
      success: true,
      message: "후원이 시작되었습니다. 감사합니다!",
    });
  } catch (error) {
    console.error("Subscription confirm error:", error);
    return NextResponse.json(
      { success: false, message: "후원 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
