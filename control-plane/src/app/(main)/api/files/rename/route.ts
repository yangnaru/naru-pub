import { NextRequest, NextResponse } from "next/server";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { validateRequest } from "@/lib/auth";
import { assertJsonContentType, getUserHomeDirectory, s3Client } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { User } from "lucia";
import * as Sentry from "@sentry/nextjs";
import { recordSiteEdit } from "@/lib/database";

function validateFilename(filename: string) {
  // Length validation
  if (filename.length > 255) {
    throw new Error("파일명이 너무 깁니다. (최대 255자)");
  }

  if (filename.length === 0) {
    throw new Error("파일명이 비어있습니다.");
  }

  // Reserved names on Windows
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    throw new Error("예약된 파일명입니다.");
  }
}

function assertNoPathTraversal(filename: string) {
  if (filename.includes("..")) {
    throw new Error("Path traversal detected in filename.");
  }
  if (filename.startsWith("/")) {
    throw new Error("Absolute path detected in filename.");
  }
}

async function invalidateCloudflareCacheSingleFile(user: User, filename: string) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!;
  const userApiToken = process.env.CLOUDFLARE_USER_API_TOKEN!;
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userApiToken}`,
    },
    body: JSON.stringify({
      files: [
        `${getUserHomeDirectory(user.loginName)}/${filename}`.replaceAll(
          "//",
          "/"
        ),
      ],
    }),
  });

  if (!response.ok) {
    Sentry.captureException(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    try {
      assertJsonContentType(request);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid content type" },
        { status: 400 }
      );
    }

    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldFilename, newFilename } = body;

    if (!oldFilename || !newFilename) {
      return NextResponse.json(
        { success: false, message: "기존 파일명과 새 파일명이 필요합니다." },
        { status: 400 }
      );
    }

    // Calculate new full path
    const pathParts = oldFilename.split('/');
    pathParts[pathParts.length - 1] = newFilename;
    const newPath = pathParts.join('/');

    try {
      assertNoPathTraversal(oldFilename);
      assertNoPathTraversal(newPath);
      validateFilename(newFilename);
    } catch (e: any) {
      return NextResponse.json(
        { success: false, message: e.message },
        { status: 400 }
      );
    }

    if (oldFilename === "/index.html") {
      return NextResponse.json(
        { success: false, message: "홈 페이지 이름은 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    try {
      // Copy the object to new location
      await s3Client.send(
        new CopyObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          CopySource: `${process.env.S3_BUCKET_NAME}/${getUserHomeDirectory(
            user.loginName
          )}/${oldFilename}`,
          Key: `${getUserHomeDirectory(user.loginName)}/${newPath}`,
        })
      );

      // Delete the old object
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `${getUserHomeDirectory(user.loginName)}/${oldFilename}`,
        })
      );

      await invalidateCloudflareCacheSingleFile(user, oldFilename);
      await invalidateCloudflareCacheSingleFile(user, newPath);

      revalidatePath("/files", "layout");
      await recordSiteEdit(user.id);

      return NextResponse.json({
        success: true,
        message: "파일 이름이 변경되었습니다.",
      });
    } catch (error) {
      console.error("S3 rename error:", error);
      return NextResponse.json(
        { success: false, message: "파일 이름 변경에 실패했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json(
      { success: false, message: "파일 이름 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}