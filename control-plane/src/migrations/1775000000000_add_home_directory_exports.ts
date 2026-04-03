import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("home_directory_exports")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
    .addColumn("r2_key", "text")
    .addColumn("size_bytes", "bigint")
    .addColumn("download_expires_at", "timestamptz")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("started_at", "timestamptz")
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("home_directory_exports_user_id_idx")
    .on("home_directory_exports")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("home_directory_exports_status_idx")
    .on("home_directory_exports")
    .column("status")
    .execute();

}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("home_directory_exports").execute();
}
