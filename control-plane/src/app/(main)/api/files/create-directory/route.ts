import { NextRequest, NextResponse } from "next/server";
import {
  PutObjectCommand,
  HeadObjectCommand,
  NotFound,
} from "@aws-sdk/client-s3";
import { validateRequest } from "@/lib/auth";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { User } from "lucia";
import {
  DEFAULT_INDEX_HTML,
  FILE_EXTENSION_MIMETYPE_MAP,
} from "@/lib/const";
import { db } from "@/lib/database";

function assertNoPathTraversal(filename: string) {
  if (filename.includes("..")) {
    throw new Error("Path traversal detected in filename.");
  }
  if (filename.startsWith("/")) {
    throw new Error("Absolute path detected in filename.");
  }
}

async function updateSiteUpdatedAt(user: User) {
  await db
    .updateTable("users")
    .set("site_updated_at", new Date())
    .where("id", "=", user.id)
    .execute();
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

    const { directory } = await request.json();

    if (!directory) {
      return NextResponse.json(
        { success: false, message: "디렉토리명이 필요합니다." },
        { status: 400 }
      );
    }

    try {
      assertNoPathTraversal(directory);
      if (directory.length > 1000) {
        throw new Error("디렉토리 경로가 너무 깁니다.");
      }
    } catch (e: any) {
      return NextResponse.json(
        { success: false, message: e.message },
        { status: 400 }
      );
    }

    const key = `${getUserHomeDirectory(
      user.loginName
    )}/${directory}/index.html`.replaceAll("//", "/");

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: key,
        })
      );
    } catch (e) {
      if (e instanceof NotFound) {
        try {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: key,
              Body: DEFAULT_INDEX_HTML,
              ContentType: FILE_EXTENSION_MIMETYPE_MAP["html"],
            })
          );
        } catch (e) {
          console.error("S3 create directory error:", e);
          return NextResponse.json(
            { success: false, message: "파일 생성에 실패했습니다." },
            { status: 500 }
          );
        }
      }
    }

    revalidatePath("/files", "layout");
    await updateSiteUpdatedAt(user);

    return NextResponse.json({
      success: true,
      message: "폴더가 생성되었습니다.",
    });
  } catch (error) {
    console.error("Create directory error:", error);
    return NextResponse.json(
      { success: false, message: "디렉토리 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}