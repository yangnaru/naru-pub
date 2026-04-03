import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/utils";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const latestExport = await db
      .selectFrom("home_directory_exports")
      .select([
        "status",
        "size_bytes",
        "r2_key",
        "download_expires_at",
        "error_message",
        "created_at",
        "completed_at",
      ])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .executeTakeFirst();

    if (!latestExport) {
      return NextResponse.json({ export: null });
    }

    let downloadUrl: string | null = null;
    if (
      latestExport.status === "completed" &&
      latestExport.r2_key &&
      latestExport.download_expires_at &&
      new Date(latestExport.download_expires_at) > new Date()
    ) {
      const remainingMs =
        new Date(latestExport.download_expires_at).getTime() - Date.now();
      const expiresIn = Math.floor(remainingMs / 1000);

      // @ts-expect-error - @smithy/types version mismatch between s3-request-presigner and client-s3
      downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: latestExport.r2_key,
        ResponseContentDisposition: `attachment; filename="${user.loginName}-export.zip"`,
      }), { expiresIn });
    }

    return NextResponse.json({
      export: {
        status: latestExport.status,
        sizeBytes: latestExport.size_bytes,
        errorMessage: latestExport.error_message,
        createdAt: latestExport.created_at,
        completedAt: latestExport.completed_at,
        downloadUrl,
      },
    });
  } catch (error) {
    console.error("Export status error:", error);
    return NextResponse.json(
      { error: "내보내기 상태 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
