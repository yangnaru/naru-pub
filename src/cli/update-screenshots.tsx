import { db } from "@/lib/database";
import { getHomepageUrl, s3Client } from "@/lib/utils";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { chromium } from "playwright";

async function main() {
  const recentlyPublishedAndNotRecentlyRenderedUsers = await db
    .selectFrom("users")
    .selectAll()
    .where("discoverable", "=", true)
    .orderBy("site_updated_at", "desc")
    .where((eb) =>
      eb.or([
        eb("site_rendered_at", "is", null),
        eb("site_rendered_at", "<", eb.ref("site_updated_at")),
      ])
    )
    .execute();

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });

  for (const user of recentlyPublishedAndNotRecentlyRenderedUsers) {
    try {
      const homepageUrl = getHomepageUrl(user.login_name);

      const page = await context.newPage();
      page.setViewportSize({ width: 640, height: 480 });
      await page.goto(homepageUrl, {
        timeout: 10 * 1000,
      });
      await page.waitForTimeout(10 * 1000);
      const screenshot = await page.screenshot();

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
    } catch (error) {
      console.error(`Failed to render ${user.login_name}: ${error}`);
    }
  }

  await context.close();
  await browser.close();
}

main();
