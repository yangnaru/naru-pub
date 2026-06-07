import { db } from "@/lib/database";
import { addInterval, BillingInterval, TossPaymentResult } from "@/lib/toss";

// Applies a one-time payment: records the ledger row and extends supporter_until,
// stacking on top of any remaining time (so paying again before expiry adds on
// rather than resetting). No subscription row — one-time donations don't renew.
export async function applyOneTimePayment(opts: {
  userId: number;
  amount: number;
  interval: BillingInterval;
  payment: TossPaymentResult;
}): Promise<{ periodStart: Date; periodEnd: Date }> {
  const now = new Date();
  const current = await db
    .selectFrom("users")
    .select("supporter_until")
    .where("id", "=", opts.userId)
    .executeTakeFirst();
  const remaining =
    current?.supporter_until && new Date(current.supporter_until) > now
      ? new Date(current.supporter_until)
      : now;
  const periodStart = remaining;
  const periodEnd = addInterval(remaining, opts.interval);

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("payments")
      .values({
        user_id: opts.userId,
        subscription_id: null,
        toss_payment_key: opts.payment.paymentKey,
        order_id: opts.payment.orderId,
        amount: opts.amount,
        status: "done",
        paid_at: now,
        period_start: periodStart,
        period_end: periodEnd,
        raw: JSON.stringify(opts.payment),
      })
      .execute();

    await trx
      .updateTable("users")
      .set({ supporter_until: periodEnd })
      .where("id", "=", opts.userId)
      .execute();
  });

  return { periodStart, periodEnd };
}

// Applies a successful Toss charge atomically: records the payment, extends the
// subscription period, and mirrors the paid-through date onto users.supporter_until
// (the column the proxy and entitlement layer gate on). Used by both the initial
// confirm flow and the recurring-charge cron.
export async function applySuccessfulCharge(opts: {
  subscriptionId: number;
  userId: number;
  interval: BillingInterval;
  amount: number;
  from: Date; // base for the new period (now for first charge, current_period_end for renewals)
  payment: TossPaymentResult;
}): Promise<{ periodStart: Date; periodEnd: Date }> {
  const periodStart = opts.from;
  const periodEnd = addInterval(periodStart, opts.interval);
  const now = new Date();

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("payments")
      .values({
        user_id: opts.userId,
        subscription_id: opts.subscriptionId,
        toss_payment_key: opts.payment.paymentKey,
        order_id: opts.payment.orderId,
        amount: opts.amount,
        status: "done",
        paid_at: now,
        period_start: periodStart,
        period_end: periodEnd,
        raw: JSON.stringify(opts.payment),
      })
      .execute();

    await trx
      .updateTable("subscriptions")
      .set({
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        next_billing_at: periodEnd,
        failed_charge_count: 0,
        updated_at: now,
      })
      .where("id", "=", opts.subscriptionId)
      .execute();

    await trx
      .updateTable("users")
      .set({ supporter_until: periodEnd })
      .where("id", "=", opts.userId)
      .execute();
  });

  return { periodStart, periodEnd };
}
