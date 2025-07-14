import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Drop the boolean column and add the timestamp column
  await db.schema
    .alterTable("users")
    .dropColumn("email_verified")
    .execute();

  await db.schema
    .alterTable("users")
    .addColumn("email_verified_at", "timestamptz", (col) => col)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert back to boolean column
  await db.schema
    .alterTable("users")
    .dropColumn("email_verified_at")
    .execute();

  await db.schema
    .alterTable("users")
    .addColumn("email_verified", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();
}