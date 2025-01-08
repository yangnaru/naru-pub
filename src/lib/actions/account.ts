"use server";

import { cookies } from "next/headers";
import { lucia, validateRequest } from "../auth";
import { db } from "../database";
import { hash, verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { DEFAULT_INDEX_HTML } from "../const";
import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getUserHomeDirectory, s3Client } from "../utils";

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

export async function signUp(login_name: string, password: string) {
  const password_hash = await hash(password);

  await prepareUserHomeDirectory(login_name);

  let user;
  try {
    user = await db
      .insertInto("users")
      .values({
        login_name: login_name.toLowerCase(),
        password_hash,
      })
      .returningAll()
      .execute();
  } catch (e: any) {
    if (e.message.includes("users_login_name_key")) {
      return {
        success: false,
        message: "이미 사용 중인 아이디입니다.",
      };
    }

    throw e;
  }

  const session = await lucia.createSession(user[0].id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return {
    success: true,
    message: "가입이 완료되었습니다.",
  };
}

export async function login(login_name: string, password: string) {
  const { user } = await validateRequest();

  if (user) {
    return redirect("/");
  }

  const existingUser = await db
    .selectFrom("users")
    .selectAll()
    .where("login_name", "=", login_name)
    .executeTakeFirst();

  if (!existingUser) {
    return {
      success: false,
      message: "아이디 또는 비밀번호가 일치하지 않습니다.",
    };
  }

  const passwordVerified = await verify(existingUser.password_hash, password);
  if (!passwordVerified) {
    return {
      success: false,
      message: "아이디 또는 비밀번호가 일치하지 않습니다.",
    };
  }

  const session = await lucia.createSession(existingUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return {
    success: true,
    message: "로그인되었습니다.",
  };
}

export async function changePassword(
  originalPassword: string,
  newPassword: string
) {
  const { user } = await validateRequest();
  if (!user) {
    return {
      success: false,
      message: "로그인이 필요합니다.",
    };
  }

  const databaseUser = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", user.id)
    .executeTakeFirst();
  if (!databaseUser) {
    return {
      success: false,
      message: "사용자가 존재하지 않습니다.",
    };
  }

  const passwordVerified = await verify(
    databaseUser.password_hash,
    originalPassword
  );
  if (!passwordVerified) {
    return {
      success: false,
      message: "기존 비밀번호가 일치하지 않습니다.",
    };
  }

  const newPasswordHash = await hash(newPassword);

  await db
    .updateTable("users")
    .set("password_hash", newPasswordHash)
    .where("id", "=", user.id)
    .execute();

  return {
    success: true,
    message: "비밀번호가 변경되었습니다.",
  };
}

export async function logout() {
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return redirect("/");
}

export async function deleteAccount() {
  const { user, session } = await validateRequest();
  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  // List all objects with user's prefix
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_NAME!,
    Prefix: getUserHomeDirectory(user.loginName),
  });

  const objects = await s3Client.send(listCommand);

  if (objects.Contents && objects.Contents.length > 0) {
    // Delete all objects in batch
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Delete: {
          Objects: objects.Contents.map((obj) => ({ Key: obj.Key! })),
        },
      })
    );
  }

  await db.deleteFrom("users").where("id", "=", user.id).execute();

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return redirect("/");
}

export async function setDiscoverable(discoverable: boolean) {
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("users")
      .set("discoverable", discoverable)
      .where("id", "=", user.id)
      .execute();

    await trx
      .updateTable("users")
      .set("site_updated_at", new Date())
      .where("id", "=", user.id)
      .execute();
  });

  return true;
}
