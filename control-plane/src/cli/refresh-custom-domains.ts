import { db } from "@/lib/database";
import {
  getCloudflareCustomHostname,
  toCustomDomainRow,
} from "@/lib/customDomains";

// Polls Cloudflare for the status of custom domains that aren't fully active
// yet, so verification completes without the user re-opening the account page
// and clicking 상태 확인. Active domains are skipped (they no longer match the
// predicate). Domains older than MAX_AGE_DAYS are left for the manual button to
// avoid polling abandoned/misconfigured domains against the Cloudflare API
// forever.
const MAX_AGE_DAYS = 14;

async function main() {
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const pending = await db
    .selectFrom("custom_domains")
    .select(["id", "hostname", "cloudflare_hostname_id"])
    .where("created_at", ">", cutoff)
    .where((eb) =>
      eb.or([
        eb("verified_at", "is", null),
        eb("cloudflare_status", "!=", "active"),
        eb("ssl_status", "is", null),
        eb("ssl_status", "!=", "active"),
      ])
    )
    .execute();

  console.log(`[refresh-custom-domains] ${pending.length} pending domain(s)`);

  for (const domain of pending) {
    try {
      const cloudflareHostname = await getCloudflareCustomHostname(
        domain.cloudflare_hostname_id
      );
      const row = toCustomDomainRow(cloudflareHostname);

      await db
        .updateTable("custom_domains")
        .set(row)
        .where("id", "=", domain.id)
        .execute();

      console.log(
        `[refresh-custom-domains] ${domain.hostname}: host=${row.cloudflare_status} ssl=${row.ssl_status ?? "-"}${row.verified_at ? " (active)" : ""}`
      );
    } catch (error) {
      console.error(
        `[refresh-custom-domains] ${domain.hostname} failed: ${error}`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[refresh-custom-domains] fatal:", error);
    process.exit(1);
  });
