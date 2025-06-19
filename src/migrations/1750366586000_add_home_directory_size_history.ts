import type { Kysely } from "kysely";
import { sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("home_directory_size_history")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.id").onDelete("cascade")
    )
    .addColumn("size_bytes", "integer", (col) => col.notNull())
    .addColumn("recorded_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Add index for efficient queries
  await db.schema
    .createIndex("home_directory_size_history_user_id_recorded_at_idx")
    .on("home_directory_size_history")
    .columns(["user_id", "recorded_at"])
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("home_directory_size_history").execute();
}
