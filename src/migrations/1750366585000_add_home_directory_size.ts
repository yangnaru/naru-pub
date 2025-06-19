import type { Kysely } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("home_directory_size_bytes", "integer", (col) =>
      col.defaultTo(0)
    )
    .addColumn("home_directory_size_bytes_updated_at", "timestamp", (col) =>
      col.defaultTo(null)
    )
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("home_directory_size_bytes")
    .dropColumn("home_directory_size_bytes_updated_at")
    .execute();
}
