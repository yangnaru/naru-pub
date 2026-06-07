import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// Toss billing/payment webhook. It only reconciles the ledger's payment status
// by orderId — it never grants entitlement (supporter_until is only ever set by
// the confirm route and renewal cron, which call Toss directly). So an
// unauthenticated/spoofed POST cannot escalate access; worst case it mislabels a
// ledger row, which the next authoritative charge corrects.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const data = ((body?.data as Record<string, unknown>) ?? body) ?? {};
    const orderId = data.orderId;
    const status = data.status;

    if (typeof orderId === "string" && typeof status === "string") {
      await db
        .updateTable("payments")
        .set({ status: status.toLowerCase() })
        .where("order_id", "=", orderId)
        .execute();
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Toss webhook error:", error);
    // Always 2xx so Toss doesn't retry indefinitely on our parse errors.
    return NextResponse.json({ received: true });
  }
}
