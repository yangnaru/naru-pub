"use server";

import {
  createSession,
  deleteSessionTokenCookie,
  generateSessionToken,
  getCurrentSession,
  invalidateSession,
  setSessionTokenCookie,
} from "../auth";
import { db } from "../db";
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
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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

export async function signUp(loginName: string, password: string) {
  const passwordHash = await hash(password);

  await prepareUserHomeDirectory(loginName);

  let user;
  try {
    user = await db
      .insert(users)
      .values({
        loginName: loginName.toLowerCase(),
        passwordHash: passwordHash,
        createdAt: Date.now(),
      })
      .returning();
  } catch (e: any) {
    return {
      success: false,
      message: "이미 사용 중인 아이디입니다.",
    };
  }

  const sessionToken = generateSessionToken();
  const sessionCookie = await createSession(sessionToken, user[0].id);

  await setSessionTokenCookie(sessionToken, new Date(sessionCookie.expiresAt));

  return {
    success: true,
    message: "가입이 완료되었습니다.",
  };
}

export async function login(loginName: string, password: string) {
  const { user } = await getCurrentSession();

  if (user) {
    return redirect("/");
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.loginName, loginName.toLowerCase()))
    .then((rows) => rows[0]);

  if (!existingUser) {
    return {
      success: false,
      message: "아이디 또는 비밀번호가 일치하지 않습니다.",
    };
  }

  const passwordVerified = await verify(existingUser.passwordHash, password);
  if (!passwordVerified) {
    return {
      success: false,
      message: "아이디 또는 비밀번호가 일치하지 않습니다.",
    };
  }

  const sessionToken = generateSessionToken();
  const sessionCookie = await createSession(sessionToken, existingUser.id);

  await setSessionTokenCookie(sessionToken, new Date(sessionCookie.expiresAt));

  return {
    success: true,
    message: "로그인되었습니다.",
  };
}

export async function changePassword(
  originalPassword: string,
  newPassword: string
) {
  const { user } = await getCurrentSession();
  if (!user) {
    return {
      success: false,
      message: "로그인이 필요합니다.",
    };
  }

  const databaseUser = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .then((rows) => rows[0]);
  if (!databaseUser) {
    return {
      success: false,
      message: "사용자가 존재하지 않습니다.",
    };
  }

  const passwordVerified = await verify(
    databaseUser.passwordHash,
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
    .update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, user.id));

  return {
    success: true,
    message: "비밀번호가 변경되었습니다.",
  };
}

export async function logout() {
  const { session } = await getCurrentSession();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await invalidateSession(session.id);
  await deleteSessionTokenCookie();

  return redirect("/");
}

export async function deleteAccount() {
  const { user, session } = await getCurrentSession();
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

  await db.delete(users).where(eq(users.id, user.id));

  await invalidateSession(session.id);
  await deleteSessionTokenCookie();

  return redirect("/");
}

export async function setDiscoverable(discoverableBoolean: boolean) {
  const { user } = await getCurrentSession();
  if (!user) {
    return false;
  }

  const discoverable = discoverableBoolean ? 1 : 0;

  await db.transaction(async (trx) => {
    await trx.update(users).set({ discoverable }).where(eq(users.id, user.id));

    await trx
      .update(users)
      .set({ siteUpdatedAt: new Date().getTime() })
      .where(eq(users.id, user.id));
  });

  return true;
}
