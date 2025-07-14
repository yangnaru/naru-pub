import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add email_verified column to users table
  await db.schema
    .alterTable("users")
    .addColumn("email_verified", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  // Create email_verification_tokens table
  await db.schema
    .createTable("email_verification_tokens")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Create index on user_id for faster lookups
  await db.schema
    .createIndex("email_verification_tokens_user_id_idx")
    .on("email_verification_tokens")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("email_verification_tokens").execute();
  await db.schema
    .alterTable("users")
    .dropColumn("email_verified")
    .execute();
}