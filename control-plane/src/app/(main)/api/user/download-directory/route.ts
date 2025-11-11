"use server";

import { validateRequest } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import archiver from "archiver";
import { Readable } from "stream";

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const bucketName = process.env.S3_BUCKET_NAME!;
    const userDirectory = getUserHomeDirectory(user.loginName);

    // List all objects in user's directory (with pagination for large directories)
    const allObjects: any[] = [];
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${userDirectory}/`,
        ContinuationToken: continuationToken,
      });

      const objects = await s3Client.send(listCommand);

      if (objects.Contents) {
        allObjects.push(...objects.Contents);
      }

      continuationToken = objects.NextContinuationToken;
    } while (continuationToken);

    if (allObjects.length === 0) {
      return NextResponse.json(
        { error: "다운로드할 파일이 없습니다." },
        { status: 404 },
      );
    }

    // Create a streaming ZIP using archiver
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Convert Node.js stream to Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        // Pipe archive data to the controller
        archive.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        archive.on("end", () => {
          controller.close();
        });

        archive.on("error", (err: Error) => {
          console.error("Archive error:", err);
          controller.error(err);
        });

        // Start processing files asynchronously
        (async () => {
          try {
            // Add each file to the archive
            for (const object of allObjects) {
              if (!object.Key) continue;

              // Get relative path (remove user directory prefix)
              const relativePath = object.Key.replace(`${userDirectory}/`, "");

              // Skip if it's just the directory itself
              if (!relativePath || relativePath === object.Key) continue;

              try {
                const getCommand = new GetObjectCommand({
                  Bucket: bucketName,
                  Key: object.Key,
                });

                const response = await s3Client.send(getCommand);

                if (response.Body) {
                  // Convert AWS SDK stream to Node.js Readable stream
                  const nodeStream = Readable.from(response.Body as any);

                  // Append file to archive with streaming
                  archive.append(nodeStream, { name: relativePath });
                }
              } catch (error) {
                console.error(`Failed to download file ${object.Key}:`, error);
                // Continue with other files even if one fails
              }
            }

            // Finalize the archive (this will trigger the 'end' event)
            await archive.finalize();
          } catch (error) {
            console.error("Error processing files:", error);
            archive.emit("error", error);
          }
        })();
      },
    });

    // Return streaming response
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${user.loginName}-directory.zip"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Directory download error:", error);
    return NextResponse.json(
      { error: "갠홈 다운로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
