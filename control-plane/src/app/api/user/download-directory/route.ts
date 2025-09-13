"use server";

import { validateRequest } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import { ZipWriter, BlobWriter } from "@zip.js/zip.js";

export async function GET() {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const bucketName = process.env.S3_BUCKET_NAME!;
    const userDirectory = getUserHomeDirectory(user.loginName);

    // List all objects in user's directory
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: userDirectory,
    });

    const objects = await s3Client.send(listCommand);

    if (!objects.Contents || objects.Contents.length === 0) {
      return NextResponse.json(
        { error: "다운로드할 파일이 없습니다." },
        { status: 404 }
      );
    }

    // Create ZIP file using zip.js
    const blobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(blobWriter);

    // Download each file and add to ZIP
    for (const object of objects.Contents) {
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
          // Convert stream to blob
          const chunks: Uint8Array[] = [];
          const reader = response.Body.transformToWebStream().getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const blob = new Blob(chunks as BlobPart[]);
          await zipWriter.add(relativePath, blob.stream());
        }
      } catch (error) {
        console.error(`Failed to download file ${object.Key}:`, error);
        // Continue with other files even if one fails
      }
    }

    // Close the ZIP writer and get the blob
    const zipBlob = await zipWriter.close();
    
    // Convert blob to array buffer
    const zipBuffer = await zipBlob.arrayBuffer();

    // Return ZIP file as download
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${user.loginName}-directory.zip"`,
        "Content-Length": zipBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error("Directory download error:", error);
    return NextResponse.json(
      { error: "갠홈 다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}