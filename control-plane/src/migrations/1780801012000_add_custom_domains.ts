import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("custom_domains_enabled", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .execute();

  await db.schema
    .createTable("custom_domains")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("hostname", "text", (col) => col.notNull().unique())
    .addColumn("cloudflare_hostname_id", "text", (col) =>
      col.notNull().unique()
    )
    .addColumn("cloudflare_status", "text", (col) => col.notNull())
    .addColumn("ssl_status", "text")
    .addColumn("ownership_verification_name", "text")
    .addColumn("ownership_verification_type", "text")
    .addColumn("ownership_verification_value", "text")
    .addColumn("ssl_validation_records", "jsonb")
    .addColumn("verification_errors", "jsonb")
    .addColumn("verified_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createIndex("custom_domains_user_id_idx")
    .on("custom_domains")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("custom_domains_verified_hostname_idx")
    .on("custom_domains")
    .column("hostname")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("custom_domains").execute();
  await db.schema
    .alterTable("users")
    .dropColumn("custom_domains_enabled")
    .execute();
}
