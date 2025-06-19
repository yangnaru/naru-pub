import { db } from "@/lib/database";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

async function calculateUserHomeDirectorySize(
  loginName: string
): Promise<number> {
  const prefix = getUserHomeDirectory(loginName);

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return 0;
    }

    // Sum up the size of all objects in the user's home directory
    const totalSize = response.Contents.reduce((sum, object) => {
      return sum + (object.Size || 0);
    }, 0);

    return totalSize;
  } catch (error) {
    console.error(`Failed to calculate size for user ${loginName}:`, error);
    return 0;
  }
}

async function updateHomeDirectorySizes() {
  console.log("Starting home directory size calculation...");

  try {
    // Get all users
    const users = await db
      .selectFrom("users")
      .select(["id", "login_name"])
      .execute();

    console.log(`Found ${users.length} users to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`Processing user: ${user.login_name}`);

        const directorySize = await calculateUserHomeDirectorySize(
          user.login_name
        );
        const now = new Date();

        // Update the users table with the calculated size and current timestamp
        await db
          .updateTable("users")
          .set({
            home_directory_size_bytes: directorySize,
            home_directory_size_bytes_updated_at: now,
          })
          .where("id", "=", user.id)
          .execute();

        // Insert a record into the history table
        await db
          .insertInto("home_directory_size_history")
          .values({
            user_id: user.id,
            size_bytes: directorySize,
            recorded_at: now,
          })
          .execute();

        console.log(`Updated ${user.login_name}: ${directorySize} bytes`);
        processedCount++;
      } catch (error) {
        console.error(`Error processing user ${user.login_name}:`, error);
        errorCount++;
      }
    }

    console.log(`\nProcessing complete!`);
    console.log(`Successfully processed: ${processedCount} users`);
    console.log(`Errors: ${errorCount} users`);
  } catch (error) {
    console.error("Failed to update home directory sizes:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

updateHomeDirectorySizes();
