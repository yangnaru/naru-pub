import { db } from "@/lib/database";
import {
  CloudflareApiError,
  deleteCloudflareCustomHostname,
} from "@/lib/customDomains";

async function main() {
  const now = new Date();

  const expiredDomains = await db
    .selectFrom("custom_domains")
    .innerJoin("users", "users.id", "custom_domains.user_id")
    .leftJoin("subscriptions", "subscriptions.user_id", "users.id")
    .select([
      "custom_domains.id",
      "custom_domains.hostname",
      "custom_domains.cloudflare_hostname_id",
      "custom_domains.user_id",
    ])
    .where("users.supporter_comp", "=", false)
    .where((eb) =>
      eb.or([
        eb("users.supporter_until", "is", null),
        eb("users.supporter_until", "<=", now),
      ]),
    )
    .where((eb) =>
      eb.or([
        eb("subscriptions.status", "is", null),
        eb("subscriptions.status", "!=", "active"),
      ]),
    )
    .execute();

  console.log(
    `[cleanup-expired-custom-domains] ${expiredDomains.length} expired domain(s) outside paid access/payment grace`,
  );

  for (const domain of expiredDomains) {
    try {
      await deleteCloudflareCustomHostname(domain.cloudflare_hostname_id);
    } catch (error) {
      if (error instanceof CloudflareApiError && error.status === 404) {
        console.warn(
          `[cleanup-expired-custom-domains] ${domain.hostname}: Cloudflare hostname already deleted`,
        );
      } else {
        console.error(
          `[cleanup-expired-custom-domains] ${domain.hostname}: Cloudflare delete failed:`,
          error,
        );
        continue;
      }
    }

    await db.deleteFrom("custom_domains").where("id", "=", domain.id).execute();

    console.log(
      `[cleanup-expired-custom-domains] ${domain.hostname}: removed for user ${domain.user_id}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[cleanup-expired-custom-domains] fatal:", error);
    process.exit(1);
  });
