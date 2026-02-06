import type { Kysely } from "kysely";
import { sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE pageview_daily_stats (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      unique_visitors INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date)
    )
  `.execute(db);

  // Index for site-wide queries (e.g., /open page)
  await sql`
    CREATE INDEX pageview_daily_stats_date_idx ON pageview_daily_stats(date)
  `.execute(db);

  // Backfill from existing pageviews data
  await sql`
    INSERT INTO pageview_daily_stats (user_id, date, views, unique_visitors)
    SELECT
      user_id,
      DATE(timestamp AT TIME ZONE 'UTC'),
      COUNT(*),
      COUNT(DISTINCT ip)
    FROM pageviews
    GROUP BY user_id, DATE(timestamp AT TIME ZONE 'UTC')
  `.execute(db);
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("pageview_daily_stats").execute();
}
