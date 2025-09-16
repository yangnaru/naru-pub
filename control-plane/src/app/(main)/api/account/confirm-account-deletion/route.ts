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
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "삭제 토큰이 필요합니다." },
        { status: 400 }
      );
    }

    const deletionToken = await db
      .selectFrom("account_deletion_tokens")
      .selectAll()
      .where("id", "=", token)
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

    if (!deletionToken) {
      return NextResponse.json(
        { success: false, message: "유효하지 않거나 만료된 계정 삭제 토큰입니다." },
        { status: 400 }
      );
    }

    const { user, session } = await validateRequest();
    if (!user || user.id !== deletionToken.user_id) {
      return NextResponse.json(
        { success: false, message: "계정 삭제 권한이 없습니다." },
        { status: 403 }
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

    await db.transaction().execute(async (trx) => {
      // Delete the account deletion token
      await trx
        .deleteFrom("account_deletion_tokens")
        .where("id", "=", token)
        .execute();

      // Delete user account (this will cascade to all related tables)
      await trx
        .deleteFrom("users")
        .where("id", "=", user.id)
        .execute();
    });

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
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { success: false, message: "계정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}