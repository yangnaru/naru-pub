import { sql } from "kysely";
import { db } from "@/lib/database";
import { dispatchSiteUpdate } from "@/lib/federation";

async function main() {
  // Coarse candidate filter — dispatchSiteUpdate repeats these predicates
  // atomically, so stale reads here are harmless.
  const candidates = await db
    .selectFrom("users")
    .select(["id", "login_name"])
    .where("site_updated_at", "is not", null)
    .where((eb) =>
      eb(
        "site_updated_at",
        ">",
        eb.fn.coalesce(
          "last_activity_sent_at",
          sql<Date>`'epoch'::timestamptz`
        )
      )
    )
    .where("site_updated_at", "<", sql<Date>`now() - interval '10 minutes'`)
    .where((eb) =>
      eb.or([
        eb("last_activity_sent_at", "is", null),
        eb(
          "last_activity_sent_at",
          "<",
          sql<Date>`now() - interval '24 hours'`
        ),
      ])
    )
    .execute();

  console.log(
    `[dispatch-site-updates] ${candidates.length} candidate(s)`
  );

  for (const user of candidates) {
    try {
      await dispatchSiteUpdate(user.id);
    } catch (err) {
      console.error(
        `[dispatch-site-updates] ${user.login_name} (id=${user.id}) failed:`,
        err
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
