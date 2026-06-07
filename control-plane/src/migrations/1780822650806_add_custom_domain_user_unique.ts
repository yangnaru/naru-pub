import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createIndex("custom_domains_user_id_unique_idx")
    .on("custom_domains")
    .column("user_id")
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("custom_domains_user_id_unique_idx").execute();
}
