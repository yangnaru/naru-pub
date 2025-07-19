import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create account_deletion_tokens table
  await db.schema
    .createTable("account_deletion_tokens")
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
    .createIndex("account_deletion_tokens_user_id_idx")
    .on("account_deletion_tokens")
    .column("user_id")
    .execute();

  // Create index on email for faster lookups by email
  await db.schema
    .createIndex("account_deletion_tokens_email_idx")
    .on("account_deletion_tokens")
    .column("email")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("account_deletion_tokens").execute();
}