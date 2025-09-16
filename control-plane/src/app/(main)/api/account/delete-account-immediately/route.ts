import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lucia, validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // Only allow immediate deletion for users without verified email
    if (user.email && user.emailVerifiedAt) {
      return NextResponse.json(
        { success: false, message: "이메일이 인증된 계정은 이메일 확인을 통해 삭제해야 합니다." },
        { status: 400 }
      );
    }

    // List all objects with user's prefix (with pagination to ensure we delete everything)
    const allObjects: any[] = [];
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        Prefix: `${getUserHomeDirectory(user.loginName)}/`,
        ContinuationToken: continuationToken,
      });

      const objects = await s3Client.send(listCommand);

      if (objects.Contents) {
        allObjects.push(...objects.Contents);
      }

      continuationToken = objects.NextContinuationToken;
    } while (continuationToken);

    if (allObjects.length > 0) {
      // Delete all objects in batches (AWS limit is 1000 objects per delete request)
      const batchSize = 1000;
      for (let i = 0; i < allObjects.length; i += batchSize) {
        const batch = allObjects.slice(i, i + batchSize);
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Delete: {
              Objects: batch.map((obj) => ({ Key: obj.Key! })),
            },
          })
        );
      }
    }

    // Delete user account (this will cascade to all related tables)
    await db.deleteFrom("users").where("id", "=", user.id).execute();

    // Invalidate session
    if (session) {
      await lucia.invalidateSession(session.id);
    }

    const sessionCookie = lucia.createBlankSessionCookie();
    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return NextResponse.json({
      success: true,
      message: "계정이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Immediate account deletion error:", error);
    return NextResponse.json(
      { success: false, message: "계정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}