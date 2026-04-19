import { parseArgs } from "node:util";
import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";
import { db } from "@/lib/database";
import { extractHtmlTitle } from "@/lib/html";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";

// Usage:
//   pnpm exec tsx src/cli/backfill-site-titles.ts
//     → fetch index.htm(l) for every user missing a site_title and extract it
//   pnpm exec tsx src/cli/backfill-site-titles.ts --user <login_name>
//     → backfill just one user
//   pnpm exec tsx src/cli/backfill-site-titles.ts --force
//     → also overwrite existing non-null site_title values

async function readIndexHtml(loginName: string): Promise<string | null> {
  const home = getUserHomeDirectory(loginName);
  for (const name of ["index.html", "index.htm"]) {
    try {
      const res = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `${home}/${name}`,
        })
      );
      return (await res.Body?.transformToString("utf-8")) ?? null;
    } catch (err) {
      if (err instanceof NoSuchKey) continue;
      // Some S3-compatible stores surface 404 as a generic error with a name.
      if ((err as { name?: string })?.name === "NoSuchKey") continue;
      throw err;
    }
  }
  return null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      user: { type: "string" },
      force: { type: "boolean", default: false },
    },
  });

  let query = db.selectFrom("users").select(["id", "login_name"]);

  if (values.user) {
    query = query.where("login_name", "=", values.user);
  }

  if (!values.force) {
    query = query.where("site_title", "is", null);
  }

  const targets = await query.orderBy("id", "asc").execute();

  if (values.user && targets.length === 0) {
    console.error(
      `[backfill-site-titles] no such user (or already has site_title): ${values.user}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(`[backfill-site-titles] ${targets.length} target(s)`);

  let updated = 0;
  let missing = 0;
  let empty = 0;

  for (const user of targets) {
    try {
      const html = await readIndexHtml(user.login_name);
      if (html === null) {
        missing += 1;
        continue;
      }
      const title = extractHtmlTitle(html);
      if (title === null) {
        empty += 1;
      }
      await db
        .updateTable("users")
        .set({ site_title: title })
        .where("id", "=", user.id)
        .execute();
      if (title !== null) {
        updated += 1;
        console.log(`${user.login_name}: ${title}`);
      }
    } catch (err) {
      console.error(`[backfill-site-titles] ${user.login_name} failed:`, err);
    }
  }

  console.log(
    `[backfill-site-titles] done — ${updated} titled, ${empty} empty, ${missing} no-index`
  );
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
