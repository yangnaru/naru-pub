import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("subscriptions")
    .addColumn("charging_started_at", "timestamptz")
    .execute();

  await db.schema
    .alterTable("payments")
    .addColumn("attempt_key", "text")
    .execute();

  await db.schema
    .createIndex("payments_attempt_key_unique_idx")
    .on("payments")
    .column("attempt_key")
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("payments_attempt_key_unique_idx").execute();
  await db.schema.alterTable("payments").dropColumn("attempt_key").execute();
  await db.schema
    .alterTable("subscriptions")
    .dropColumn("charging_started_at")
    .execute();
}
