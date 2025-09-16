import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lucia } from "@/lib/auth";
import { db } from "@/lib/database";
import { hash } from "@node-rs/argon2";
import { DEFAULT_INDEX_HTML } from "@/lib/const";
import {
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";

async function prepareUserHomeDirectory(userName: string) {
  const bucketName = process.env.S3_BUCKET_NAME!;

  // Check if index.html exists
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: `${getUserHomeDirectory(userName)}/index.html`.replaceAll(
          "//",
          "/"
        ),
      })
    );
  } catch (error: any) {
    // If file doesn't exist (404), create it
    if (error.$metadata?.httpStatusCode === 404) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: `${getUserHomeDirectory(userName)}/index.html`.replaceAll(
            "//",
            "/"
          ),
          Body: DEFAULT_INDEX_HTML,
          ContentType: "text/html",
        })
      );
    } else {
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { login_name, password } = await request.json();

    if (!login_name || !password) {
      return NextResponse.json(
        { success: false, message: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const password_hash = await hash(password);

    await prepareUserHomeDirectory(login_name);

    let user;
    try {
      user = await db
        .insertInto("users")
        .values({
          login_name: login_name.toLowerCase(),
          password_hash,
          home_directory_size_bytes: 0,
          home_directory_size_bytes_updated_at: null,
        })
        .returningAll()
        .execute();
    } catch (e: any) {
      if (e.message.includes("users_login_name_key")) {
        return NextResponse.json(
          { success: false, message: "이미 사용 중인 아이디입니다." },
          { status: 400 }
        );
      }
      throw e;
    }

    const session = await lucia.createSession(user[0].id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return NextResponse.json({
      success: true,
      message: "가입이 완료되었습니다.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, message: "가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}