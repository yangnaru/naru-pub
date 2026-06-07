import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("followers")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("actor_iri", "text", (col) => col.notNull())
    .addColumn("inbox_iri", "text", (col) => col.notNull())
    .addColumn("shared_inbox_iri", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addUniqueConstraint("followers_user_actor_unique", [
      "user_id",
      "actor_iri",
    ])
    .execute();

  await db.schema
    .createIndex("followers_user_id_idx")
    .on("followers")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("followers").execute();
}
