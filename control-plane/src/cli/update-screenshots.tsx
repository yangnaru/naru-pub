import { parseArgs } from "node:util";
import { db } from "@/lib/database";
import { dispatchActorUpdate } from "@/lib/federation";
import { getHomepageUrl, getRenderedSiteUrl, s3Client } from "@/lib/utils";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Browser, BrowserContext, chromium } from "playwright";

// Usage:
//   pnpm exec tsx src/cli/update-screenshots.tsx
//     → render all discoverable users whose site was updated after the last
//       render (the cron path)
//   pnpm exec tsx src/cli/update-screenshots.tsx --user <login_name>
//     → render a single user, still gated by the same predicate
//   pnpm exec tsx src/cli/update-screenshots.tsx --force
//     → render every discoverable user, ignoring the predicate
//   pnpm exec tsx src/cli/update-screenshots.tsx --user <login_name> --force
//     → render that user, ignoring the predicate

type TargetUser = { id: number; login_name: string };

async function selectTargets(
  loginName: string | undefined,
  force: boolean
): Promise<TargetUser[]> {
  let query = db
    .selectFrom("users")
    .select(["id", "login_name"])
    .where("discoverable", "=", true)
    .orderBy("site_updated_at", "desc");

  if (loginName) {
    query = query.where("login_name", "=", loginName);
  }

  if (!force) {
    query = query.where((eb) =>
      eb.or([
        eb("site_rendered_at", "is", null),
        eb("site_rendered_at", "<", eb.ref("site_updated_at")),
      ])
    );
  }

  return await query.execute();
}

async function purgeCloudflareCache(url: string): Promise<void> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !apiToken) return;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: [url] }),
      }
    );
    if (!res.ok) {
      console.error(
        `Cloudflare purge failed for ${url}: ${res.status} ${await res.text()}`
      );
      return;
    }
    console.log(`Purged Cloudflare cache for ${url}`);
  } catch (err) {
    console.error(`Cloudflare purge error for ${url}: ${err}`);
  }
}

async function renderUser(
  context: BrowserContext,
  user: TargetUser
): Promise<void> {
  const homepageUrl = getHomepageUrl(user.login_name);

  const page = await context.newPage();
  page.setViewportSize({ width: 640, height: 480 });
  await page.goto(homepageUrl, { timeout: 10 * 1000 });
  await page.waitForTimeout(10 * 1000);
  const screenshot = await page.screenshot();
  await page.close();

  if (screenshot.length === 0) {
    console.log(`Skipping ${user.login_name}: screenshot is 0 bytes`);
    return;
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME_SCREENSHOTS!,
      Key: `${user.login_name}.png`,
      Body: screenshot,
      ContentType: "image/png",
    })
  );
  console.log(`Uploaded screenshot for ${user.login_name}`);

  await db
    .updateTable("users")
    .set({ site_rendered_at: new Date() })
    .where("id", "=", user.id)
    .executeTakeFirst();

  await purgeCloudflareCache(getRenderedSiteUrl(user.login_name));
  await dispatchActorUpdate(user.id);
}

async function main() {
  const { values } = parseArgs({
    options: {
      user: { type: "string" },
      force: { type: "boolean", default: false },
    },
  });

  const targets = await selectTargets(values.user, values.force ?? false);

  if (values.user && targets.length === 0) {
    console.error(`[update-screenshots] no such discoverable user: ${values.user}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[update-screenshots] ${targets.length} target(s)`);

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ deviceScaleFactor: 2 });

    for (const user of targets) {
      try {
        await renderUser(context, user);
      } catch (error) {
        console.error(`Failed to render ${user.login_name}: ${error}`);
      }
    }

    await context.close();
  } finally {
    if (browser) await browser.close();
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
