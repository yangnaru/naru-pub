import { config } from "dotenv";
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// Load environment variables from .env file
config();

// Ensure environment variables are loaded
const requiredEnvVars = [
  "S3_BUCKET_NAME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "R2_ACCOUNT_ID"
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Please check your .env file");
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');


// Create S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface ObjectWithSlashes {
  key: string;
  slashCount: number;
  consecutiveSlashes: string[];
}

function normalizeKey(key: string): string {
  // Replace multiple consecutive slashes with single slashes
  return key.replace(/\/\/+/g, '/');
}

async function checkObjectExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

async function renameObject(oldKey: string, newKey: string): Promise<boolean> {
  try {
    // Copy object to new key
    await s3Client.send(new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      CopySource: `${process.env.S3_BUCKET_NAME}/${encodeURIComponent(oldKey)}`,
      Key: newKey,
    }));

    // Delete old object
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: oldKey,
    }));

    return true;
  } catch (error) {
    console.error(`Failed to rename ${oldKey} to ${newKey}:`, error);
    return false;
  }
}

async function findObjectsWithMultipleSlashes(): Promise<ObjectWithSlashes[]> {
  const objectsWithMultipleSlashes: ObjectWithSlashes[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            const consecutiveSlashes = object.Key.match(/\/\/+/g);

            if (consecutiveSlashes && consecutiveSlashes.length > 0) {
              objectsWithMultipleSlashes.push({
                key: object.Key,
                slashCount: consecutiveSlashes.reduce((total, match) => total + match.length - 1, 0),
                consecutiveSlashes,
              });
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;

      if (continuationToken) {
        console.log(`Processed batch, continuing with token: ${continuationToken.substring(0, 20)}...`);
      }
    } while (continuationToken);

    return objectsWithMultipleSlashes;
  } catch (error) {
    console.error("Failed to list objects from S3:", error);
    throw error;
  }
}

async function main() {
  console.log(isDryRun ?
    "Scanning for R2 objects with multiple consecutive slashes (dry run)..." :
    "Fixing R2 objects with multiple consecutive slashes...");

  try {
    const objectsWithSlashes = await findObjectsWithMultipleSlashes();

    console.log(`\nFound ${objectsWithSlashes.length} objects with multiple consecutive slashes:\n`);

    if (objectsWithSlashes.length === 0) {
      console.log("No objects found with multiple consecutive slashes.");
      return;
    }

    let fixedCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    for (const obj of objectsWithSlashes) {
      const normalizedKey = normalizeKey(obj.key);

      console.log(`Processing: ${obj.key}`);
      console.log(`  → Would become: ${normalizedKey}`);

      if (obj.key === normalizedKey) {
        console.log("  ✓ Already normalized (skipping)");
        continue;
      }

      if (isDryRun) {
        console.log("  🔍 Dry run - would rename this object");
        fixedCount++;
      } else {
        // Check if target already exists
        const targetExists = await checkObjectExists(normalizedKey);

        if (targetExists) {
          console.log(`  ⚠️  Conflict: ${normalizedKey} already exists, skipping rename`);
          conflictCount++;
        } else {
          const success = await renameObject(obj.key, normalizedKey);
          if (success) {
            console.log("  ✅ Successfully renamed");
            fixedCount++;
          } else {
            console.log("  ❌ Failed to rename");
            errorCount++;
          }
        }
      }
      console.log("");
    }

    console.log("\n=== Summary ===");
    if (isDryRun) {
      console.log(`Objects that would be fixed: ${fixedCount}`);
      console.log(`Total objects found: ${objectsWithSlashes.length}`);
      console.log("\nRun without --dry-run to actually fix these objects.");
    } else {
      console.log(`Successfully fixed: ${fixedCount}`);
      console.log(`Conflicts (skipped): ${conflictCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log(`Total processed: ${objectsWithSlashes.length}`);
    }
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

main();