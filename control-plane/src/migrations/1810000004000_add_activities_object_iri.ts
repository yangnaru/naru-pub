import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("activities")
    .addColumn("object_iri", "text")
    .execute();

  await db.schema
    .createIndex("activities_object_iri_idx")
    .on("activities")
    .column("object_iri")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("activities")
    .dropColumn("object_iri")
    .execute();
}
