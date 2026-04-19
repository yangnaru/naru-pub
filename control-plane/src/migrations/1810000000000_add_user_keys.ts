import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("user_keys")
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("key_type", "text", (col) => col.notNull())
    .addColumn("private_key", "jsonb", (col) => col.notNull())
    .addColumn("public_key", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addPrimaryKeyConstraint("user_keys_pkey", ["user_id", "key_type"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("user_keys").execute();
}
