import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/database";

const ALLOWED_PAYMENT_STATUSES = new Set([
  "ready",
  "in_progress",
  "waiting_for_deposit",
  "done",
  "canceled",
  "partial_canceled",
  "aborted",
  "expired",
  "failed",
]);
const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function verifyWebhookSignature(request: NextRequest, rawBody: string) {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (!secret) return true;

  const timestamp = request.headers.get("x-toss-timestamp");
  const signature = request.headers.get("x-toss-signature");
  if (!timestamp || !signature) return false;

  const timestampMs = Number(timestamp);
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > WEBHOOK_TOLERANCE_MS
  ) {
    return false;
  }

  const expected =
    "v1=" +
    createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
  return safeEqual(expected, signature);
}

// Toss billing/payment webhook. It only reconciles the ledger's payment status
// by orderId — it never grants entitlement (supporter_until is only ever set by
// the confirm route and renewal cron, which call Toss directly). So an
// unauthenticated/spoofed POST cannot escalate access.
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!verifyWebhookSignature(request, rawBody)) {
      return NextResponse.json({ received: false }, { status: 401 });
    }

    const body =
      (JSON.parse(rawBody || "null") as Record<string, unknown> | null) ?? null;
    const data = (body?.data as Record<string, unknown>) ?? body ?? {};
    const orderId = data.orderId;
    const status =
      typeof data.status === "string" ? data.status.toLowerCase() : null;

    if (
      typeof orderId === "string" &&
      status &&
      ALLOWED_PAYMENT_STATUSES.has(status)
    ) {
      await db
        .updateTable("payments")
        .set({ status })
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
