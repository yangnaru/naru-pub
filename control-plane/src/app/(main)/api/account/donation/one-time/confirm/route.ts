import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import { assertJsonContentType } from "@/lib/utils";
import { confirmPayment, ONE_TIME_YEAR_AMOUNT, TossApiError } from "@/lib/toss";
import { applyOneTimePayment } from "@/lib/subscriptions";

// One-time donation step 2: confirms the payment with Toss and grants 1 year of
// supporter access. Entitlement is granted based on the amount Toss reports, not
// the client.
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

    const { paymentKey, orderId, amount } = await request.json();
    if (
      typeof paymentKey !== "string" ||
      typeof orderId !== "string" ||
      typeof amount !== "number"
    ) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 요청입니다." },
        { status: 400 }
      );
    }

    let payment;
    try {
      payment = await confirmPayment({ paymentKey, orderId, amount });
    } catch (err) {
      await db
        .insertInto("payments")
        .values({
          user_id: user.id,
          order_id: orderId,
          amount,
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

    // Grant based on the amount Toss actually confirmed.
    if (payment.status !== "DONE" || payment.totalAmount !== ONE_TIME_YEAR_AMOUNT) {
      await db
        .insertInto("payments")
        .values({
          user_id: user.id,
          toss_payment_key: payment.paymentKey,
          order_id: payment.orderId ?? orderId,
          amount: payment.totalAmount ?? amount,
          status: "failed",
          raw: JSON.stringify(payment),
        })
        .execute();
      return NextResponse.json(
        { success: false, message: "결제가 올바르게 완료되지 않았습니다." },
        { status: 402 }
      );
    }

    await applyOneTimePayment({
      userId: user.id,
      amount: ONE_TIME_YEAR_AMOUNT,
      interval: "year",
      payment,
    });

    return NextResponse.json({
      success: true,
      message: "후원해 주셔서 감사합니다! 1년간 후원자 기능을 이용하실 수 있습니다.",
    });
  } catch (error) {
    console.error("One-time confirm error:", error);
    return NextResponse.json(
      { success: false, message: "후원 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
