import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import {
  newOrderId,
  ONE_TIME_YEAR_AMOUNT,
  ONE_TIME_YEAR_ORDER_NAME,
} from "@/lib/toss";

// One-time donation step 1: returns a server-generated orderId + the
// authoritative amount for requestPayment.
export async function POST(_request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // Ensure a stable customerKey for dashboard linkage (optional for one-time).
    const userRow = await db
      .selectFrom("users")
      .select("toss_customer_key")
      .where("id", "=", user.id)
      .executeTakeFirst();
    let customerKey = userRow?.toss_customer_key ?? null;
    if (!customerKey) {
      customerKey = randomUUID();
      await db
        .updateTable("users")
        .set({ toss_customer_key: customerKey })
        .where("id", "=", user.id)
        .execute();
    }

    return NextResponse.json({
      success: true,
      customerKey,
      orderId: newOrderId(),
      amount: ONE_TIME_YEAR_AMOUNT,
      orderName: ONE_TIME_YEAR_ORDER_NAME,
    });
  } catch (error) {
    console.error("One-time prepare error:", error);
    return NextResponse.json(
      { success: false, message: "후원 준비 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
