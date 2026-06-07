import { db } from "@/lib/database";
import {
  BillingInterval,
  chargeBillingKey,
  newOrderId,
  PLAN_ORDER_NAMES,
} from "@/lib/toss";
import { applySuccessfulCharge } from "@/lib/subscriptions";

// Renews active subscriptions whose next_billing_at has passed. On success the
// period extends contiguously and supporter_until advances. On failure the
// attempt is retried on subsequent runs (next_billing_at stays in the past)
// until MAX_FAILURES, after which the subscription is marked past_due and access
// has already lapsed at current_period_end.
const MAX_FAILURES = 4;

async function main() {
  const now = new Date();

  const due = await db
    .selectFrom("subscriptions")
    .select([
      "id",
      "user_id",
      "billing_interval",
      "amount",
      "toss_billing_key",
      "toss_customer_key",
      "current_period_end",
      "failed_charge_count",
    ])
    .where("status", "=", "active")
    .where("toss_billing_key", "is not", null)
    .where("next_billing_at", "<=", now)
    .execute();

  console.log(`[charge-subscriptions] ${due.length} subscription(s) due`);

  for (const sub of due) {
    const interval = sub.billing_interval as BillingInterval;
    const orderId = newOrderId();
    try {
      const payment = await chargeBillingKey({
        billingKey: sub.toss_billing_key!,
        customerKey: sub.toss_customer_key,
        amount: sub.amount,
        orderId,
        orderName: PLAN_ORDER_NAMES[interval],
      });
      if (payment.status !== "DONE") {
        throw new Error(`unexpected payment status: ${payment.status}`);
      }

      // Keep periods contiguous, but never grant a period that's already in the past.
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end)
        : now;
      const base = periodEnd > now ? periodEnd : now;

      await applySuccessfulCharge({
        subscriptionId: sub.id,
        userId: sub.user_id,
        interval,
        amount: sub.amount,
        from: base,
        payment,
      });
      console.log(`[charge-subscriptions] user ${sub.user_id}: renewed`);
    } catch (err) {
      const failures = sub.failed_charge_count + 1;
      const nextStatus = failures >= MAX_FAILURES ? "past_due" : "active";
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto("payments")
          .values({
            user_id: sub.user_id,
            subscription_id: sub.id,
            order_id: orderId,
            amount: sub.amount,
            status: "failed",
            raw: JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
          })
          .execute();
        await trx
          .updateTable("subscriptions")
          .set({
            failed_charge_count: failures,
            status: nextStatus,
            updated_at: new Date(),
          })
          .where("id", "=", sub.id)
          .execute();
      });
      console.error(
        `[charge-subscriptions] user ${sub.user_id}: charge failed (${failures}/${MAX_FAILURES}) -> ${nextStatus}: ${err}`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[charge-subscriptions] fatal:", error);
    process.exit(1);
  });
