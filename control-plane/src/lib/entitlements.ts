import { db } from "@/lib/database";

// Features that a paid (supporter) plan can unlock. Add new features here as
// they become gated. `analytics` is currently open to everyone; when that
// changes, add it to the supporter plan below — no other change needed.
export type Feature = "custom_domains" | "analytics";

export const PLAN_FEATURES: Record<string, Feature[]> = {
  supporter: ["custom_domains"],
  // To gate analytics later: supporter: ["custom_domains", "analytics"],
  // To add a richer tier later, add another plan key with its feature list.
};

export type UserEntitlement = {
  isSupporter: boolean;
  comp: boolean;
  plan: string | null;
  supporterUntil: Date | null;
  inPaymentGrace: boolean;
};

// Resolves a user's current entitlement. A user is a supporter if they have a
// permanent comp, a paid-through date in the future, or an active subscription
// still inside the payment retry grace window.
export async function getUserEntitlement(
  userId: number,
): Promise<UserEntitlement> {
  const row = await db
    .selectFrom("users")
    .leftJoin("subscriptions", "subscriptions.user_id", "users.id")
    .select([
      "users.supporter_comp as comp",
      "users.supporter_until as supporterUntil",
      "subscriptions.plan as plan",
      "subscriptions.status as subscriptionStatus",
    ])
    .where("users.id", "=", userId)
    .executeTakeFirst();

  if (!row) {
    return {
      isSupporter: false,
      comp: false,
      plan: null,
      supporterUntil: null,
      inPaymentGrace: false,
    };
  }

  const comp = !!row.comp;
  const supporterUntil = row.supporterUntil
    ? new Date(row.supporterUntil)
    : null;
  const paid = supporterUntil != null && supporterUntil.getTime() > Date.now();
  const inPaymentGrace = !paid && row.subscriptionStatus === "active";
  const isSupporter = comp || paid || inPaymentGrace;
  // Comp users have no subscription row, so default them to the supporter plan.
  const plan = row.plan ?? (comp ? "supporter" : null);

  return { isSupporter, comp, plan, supporterUntil, inPaymentGrace };
}

export async function userHasFeature(
  userId: number,
  feature: Feature,
): Promise<boolean> {
  const ent = await getUserEntitlement(userId);
  if (!ent.isSupporter) return false;
  const planFeatures = PLAN_FEATURES[ent.plan ?? "supporter"] ?? [];
  return planFeatures.includes(feature);
}
