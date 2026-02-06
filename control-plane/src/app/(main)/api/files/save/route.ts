import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { validateRequest } from "@/lib/auth";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import { User } from "lucia";
import * as Sentry from "@sentry/nextjs";
import {
  EDITABLE_FILE_EXTENSIONS,
  FILE_EXTENSION_MIMETYPE_MAP,
} from "@/lib/const";
import { recordSiteEdit } from "@/lib/database";

function assertNoPathTraversal(filename: string) {
  if (filename.includes("..")) {
    throw new Error("Path traversal detected in filename.");
  }
  if (filename.startsWith("/")) {
    throw new Error("Absolute path detected in filename.");
  }
}

function assertEditableFilename(filename: string) {
  const extension = filename.split(".").pop();
  if (!extension || !EDITABLE_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(`File type ${extension} is not editable.`);
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
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { filename, contents } = await request.json();

    if (!filename || contents === undefined) {
      return NextResponse.json(
        { success: false, message: "파일명과 내용이 필요합니다." },
        { status: 400 }
      );
    }

    try {
      assertNoPathTraversal(filename);
      assertEditableFilename(filename);
    } catch (e: any) {
      return NextResponse.json(
        { success: false, message: e.message },
        { status: 400 }
      );
    }

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `${getUserHomeDirectory(user.loginName)}/${filename}`,
          Body: contents,
          ContentType: FILE_EXTENSION_MIMETYPE_MAP[filename.split(".").pop()!],
        })
      );
    } catch (e) {
      console.error("S3 save error:", e);
      return NextResponse.json(
        { success: false, message: "파일 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    try {
      await recordSiteEdit(user.id);
    } catch (e) {
      Sentry.captureException(e);
    }

    try {
      await invalidateCloudflareCacheSingleFile(user, filename);
    } catch (e) {
      Sentry.captureException(e);
    }

    return NextResponse.json({
      success: true,
      message: "파일이 저장되었습니다.",
    });
  } catch (error) {
    console.error("Save file error:", error);
    return NextResponse.json(
      { success: false, message: "파일 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}