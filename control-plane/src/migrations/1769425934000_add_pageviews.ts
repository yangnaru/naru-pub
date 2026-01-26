import type { Kysely } from "kysely";
import { sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE pageviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
      path TEXT NOT NULL DEFAULT '/',
      ip INET NOT NULL
    )
  `.execute(db);

  // Add index for user_id + timestamp queries
  await sql`
    CREATE INDEX pageviews_user_id_timestamp_idx ON pageviews(user_id, timestamp)
  `.execute(db);

  // Add index for timestamp-only queries (site-wide stats)
  await sql`
    CREATE INDEX pageviews_timestamp_idx ON pageviews(timestamp)
  `.execute(db);
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("pageviews").execute();
}
