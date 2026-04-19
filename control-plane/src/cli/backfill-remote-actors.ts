import { sql } from "kysely";
import { isActor } from "@fedify/fedify/vocab";
import { db } from "@/lib/database";
import { federation } from "@/lib/federation";
import { configureLogging } from "@/lib/logging";

async function main() {
  await configureLogging();

  const baseUrl = new URL(process.env.BASE_URL ?? "http://localhost:3000");
  const ctx = federation.createContext(baseUrl, undefined);

  const rows = await db
    .selectFrom("remote_actors")
    .select(["id", "iri"])
    .where((eb) =>
      eb.or([
        eb("preferred_username", "is", null),
        eb("profile_url", "is", null),
      ])
    )
    .execute();

  console.log(
    `[backfill-remote-actors] ${rows.length} actor(s) missing cached metadata`
  );

  for (const row of rows) {
    try {
      const obj = await ctx.lookupObject(row.iri);
      if (!isActor(obj)) {
        console.warn(
          `[backfill-remote-actors] ${row.iri}: lookup returned non-actor, skipping`
        );
        continue;
      }
      const preferredUsername =
        obj.preferredUsername != null
          ? obj.preferredUsername.toString()
          : null;
      const name = obj.name != null ? obj.name.toString() : null;
      const profileUrl =
        obj.url instanceof URL
          ? obj.url.href
          : typeof obj.url === "string"
            ? obj.url
            : null;
      const inboxId = obj.inboxId ?? null;
      const sharedInbox = obj.endpoints?.sharedInbox ?? null;

      await db
        .updateTable("remote_actors")
        .set({
          inbox_iri: inboxId?.href ?? undefined,
          shared_inbox_iri: sharedInbox?.href ?? null,
          preferred_username: preferredUsername,
          name,
          profile_url: profileUrl,
          fetched_at: sql`now()`,
        })
        .where("id", "=", row.id)
        .execute();

      console.log(
        `[backfill-remote-actors] ${row.iri} → @${preferredUsername} (${profileUrl})`
      );
    } catch (err) {
      console.error(
        `[backfill-remote-actors] ${row.iri} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  await db.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
