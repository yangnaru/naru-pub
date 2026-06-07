import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Time-based, feature-bundled entitlement replaces the custom_domains_enabled
  // boolean. supporter_until mirrors the active subscription's period end so the
  // proxy can gate cheaply; supporter_comp marks permanent complimentary access.
  await db.schema
    .alterTable("users")
    .addColumn("supporter_comp", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .addColumn("supporter_until", "timestamptz")
    .addColumn("toss_customer_key", "uuid")
    .execute();

  // Grandfather existing manually-enabled accounts as permanent comps.
  await sql`
    UPDATE users SET supporter_comp = true WHERE custom_domains_enabled = true
  `.execute(db);

  await db.schema
    .createTable("subscriptions")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().unique().references("users.id").onDelete("cascade")
    )
    .addColumn("plan", "text", (col) => col.defaultTo("supporter").notNull())
    .addColumn("billing_interval", "text", (col) => col.notNull()) // 'month' | 'year'
    .addColumn("amount", "integer", (col) => col.notNull()) // KRW
    .addColumn("status", "text", (col) => col.notNull()) // incomplete|active|past_due|canceled
    .addColumn("toss_customer_key", "uuid", (col) => col.notNull())
    .addColumn("toss_billing_key", "text") // server-only secret
    .addColumn("current_period_start", "timestamptz")
    .addColumn("current_period_end", "timestamptz")
    .addColumn("next_billing_at", "timestamptz")
    .addColumn("failed_charge_count", "integer", (col) =>
      col.defaultTo(0).notNull()
    )
    .addColumn("canceled_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createTable("payments")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("subscription_id", "integer", (col) =>
      col.references("subscriptions.id").onDelete("set null")
    )
    .addColumn("toss_payment_key", "text")
    .addColumn("order_id", "text", (col) => col.notNull().unique())
    .addColumn("amount", "integer", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("paid_at", "timestamptz")
    .addColumn("period_start", "timestamptz")
    .addColumn("period_end", "timestamptz")
    .addColumn("raw", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createIndex("payments_user_id_idx")
    .on("payments")
    .column("user_id")
    .execute();

  await db.schema.alterTable("users").dropColumn("custom_domains_enabled").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("custom_domains_enabled", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .execute();

  await sql`
    UPDATE users SET custom_domains_enabled = true
    WHERE supporter_comp = true OR supporter_until > now()
  `.execute(db);

  await db.schema.dropTable("payments").execute();
  await db.schema.dropTable("subscriptions").execute();

  await db.schema
    .alterTable("users")
    .dropColumn("toss_customer_key")
    .dropColumn("supporter_until")
    .dropColumn("supporter_comp")
    .execute();
}
