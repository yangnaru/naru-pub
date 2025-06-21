import { defineConfig } from "kysely-ctl";
import { db } from "./src/lib/database";

export default defineConfig({
  kysely: db,
  migrations: {
    migrationFolder: "./src/migrations",
  },
});
