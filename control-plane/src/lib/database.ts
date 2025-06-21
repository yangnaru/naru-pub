import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";

import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
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
