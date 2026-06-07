import { Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("github_deploy_targets")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("github_repository", "text", (col) => col.notNull())
    .addColumn("github_ref", "text", (col) => col.notNull())
    .addColumn("target_prefix", "text", (col) => col.notNull().defaultTo(""))
    .addColumn("delete_removed_files", "boolean", (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("last_manifest", "jsonb")
    .addColumn("last_github_sha", "text")
    .addColumn("last_deployed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("github_deploy_targets_unique_target", [
      "user_id",
      "github_repository",
      "github_ref",
      "target_prefix",
    ])
    .execute();

  await db.schema
    .createTable("github_deployments")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("target_id", "integer", (col) =>
      col.notNull().references("github_deploy_targets.id").onDelete("cascade"),
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("status", "text", (col) => col.notNull().defaultTo("planned"))
    .addColumn("github_repository", "text", (col) => col.notNull())
    .addColumn("github_ref", "text", (col) => col.notNull())
    .addColumn("github_sha", "text", (col) => col.notNull())
    .addColumn("target_prefix", "text", (col) => col.notNull())
    .addColumn("upload_prefix", "text", (col) => col.notNull())
    .addColumn("delete_removed_files", "boolean", (col) => col.notNull())
    .addColumn("manifest", "jsonb", (col) => col.notNull())
    .addColumn("deleted_paths", "jsonb", (col) => col.notNull())
    .addColumn("error_message", "text")
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("finalized_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("github_deployments_target_created_at_idx")
    .on("github_deployments")
    .columns(["target_id", "created_at"])
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex("github_deployments_target_created_at_idx")
    .execute();
  await db.schema.dropTable("github_deployments").execute();
  await db.schema.dropTable("github_deploy_targets").execute();
}
