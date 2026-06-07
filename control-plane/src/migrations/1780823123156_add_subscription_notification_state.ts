import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("subscriptions")
    .addColumn("renewal_notice_sent_at", "timestamptz")
    .addColumn("payment_grace_notice_sent_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("subscriptions")
    .dropColumn("payment_grace_notice_sent_at")
    .dropColumn("renewal_notice_sent_at")
    .execute();
}
