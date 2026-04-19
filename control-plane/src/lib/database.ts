import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";

import { Pool } from "pg";
import { Kysely, PostgresDialect, sql } from "kysely";
import { DB } from "./db";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export const adapter = new NodePostgresAdapter(pool, {
  session: "sessions",
  user: "users",
});

/**
 * Records a site edit by updating site_updated_at and incrementing daily edit stats.
 * Use this instead of directly updating site_updated_at.
 */
export async function recordSiteEdit(userId: number): Promise<void> {
  // Update site_updated_at
  await db
    .updateTable("users")
    .set("site_updated_at", new Date())
    .where("id", "=", userId)
    .execute();

  // Upsert daily edit stats
  await sql`
    INSERT INTO edit_daily_stats (user_id, date, edit_count)
    VALUES (${userId}, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date) DO UPDATE SET
      edit_count = edit_daily_stats.edit_count + 1
  `.execute(db);
}
