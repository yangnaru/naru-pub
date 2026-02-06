import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE edit_daily_stats (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      edit_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date)
    )
  `.execute(db);

  // Index for site-wide queries (e.g., /open page)
  await sql`
    CREATE INDEX edit_daily_stats_date_idx ON edit_daily_stats(date)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("edit_daily_stats").execute();
}
