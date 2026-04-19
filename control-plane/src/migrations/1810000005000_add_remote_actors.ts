import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("remote_actors")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("iri", "text", (col) => col.notNull().unique())
    .addColumn("inbox_iri", "text", (col) => col.notNull())
    .addColumn("shared_inbox_iri", "text")
    .addColumn("preferred_username", "text")
    .addColumn("name", "text")
    .addColumn("profile_url", "text")
    .addColumn("fetched_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Stage the FK column as nullable so we can backfill before enforcing.
  await db.schema
    .alterTable("followers")
    .addColumn("remote_actor_id", "integer", (col) =>
      col.references("remote_actors.id").onDelete("cascade")
    )
    .execute();

  // Copy each distinct follower actor into remote_actors, then link back.
  await sql`
    INSERT INTO remote_actors (iri, inbox_iri, shared_inbox_iri)
    SELECT DISTINCT ON (actor_iri) actor_iri, inbox_iri, shared_inbox_iri
    FROM followers
    ORDER BY actor_iri, id
    ON CONFLICT (iri) DO NOTHING
  `.execute(db);

  await sql`
    UPDATE followers f
    SET remote_actor_id = ra.id
    FROM remote_actors ra
    WHERE ra.iri = f.actor_iri
  `.execute(db);

  await db.schema
    .alterTable("followers")
    .alterColumn("remote_actor_id", (ac) => ac.setNotNull())
    .execute();

  // Swap the uniqueness constraint from (user_id, actor_iri) to
  // (user_id, remote_actor_id) before dropping the denormalized columns.
  await sql`ALTER TABLE followers DROP CONSTRAINT followers_user_actor_unique`
    .execute(db);
  await db.schema
    .alterTable("followers")
    .addUniqueConstraint("followers_user_remote_actor_unique", [
      "user_id",
      "remote_actor_id",
    ])
    .execute();

  await db.schema
    .alterTable("followers")
    .dropColumn("actor_iri")
    .dropColumn("inbox_iri")
    .dropColumn("shared_inbox_iri")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Reverse schema shape. Data that was in the old columns is lost if you
  // roll back after further writes — this is best-effort.
  await db.schema
    .alterTable("followers")
    .addColumn("actor_iri", "text")
    .addColumn("inbox_iri", "text")
    .addColumn("shared_inbox_iri", "text")
    .execute();

  await sql`
    UPDATE followers f
    SET
      actor_iri = ra.iri,
      inbox_iri = ra.inbox_iri,
      shared_inbox_iri = ra.shared_inbox_iri
    FROM remote_actors ra
    WHERE ra.id = f.remote_actor_id
  `.execute(db);

  await db.schema
    .alterTable("followers")
    .alterColumn("actor_iri", (ac) => ac.setNotNull())
    .alterColumn("inbox_iri", (ac) => ac.setNotNull())
    .execute();

  await sql`ALTER TABLE followers DROP CONSTRAINT followers_user_remote_actor_unique`
    .execute(db);
  await db.schema
    .alterTable("followers")
    .addUniqueConstraint("followers_user_actor_unique", [
      "user_id",
      "actor_iri",
    ])
    .execute();

  await db.schema
    .alterTable("followers")
    .dropColumn("remote_actor_id")
    .execute();

  await db.schema.dropTable("remote_actors").execute();
}
