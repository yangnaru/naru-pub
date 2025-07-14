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
import { sendVerificationEmail, generateVerificationToken } from "../email";

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
        home_directory_size_bytes: 0,
        home_directory_size_bytes_updated_at: null,
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

  (await cookies()).set(
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

  (await cookies()).set(
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
  (await cookies()).set(
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
  (await cookies()).set(
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

export async function associateEmail(email: string) {
  const { user } = await validateRequest();
  if (!user) {
    return {
      success: false,
      message: "로그인이 필요합니다.",
    };
  }

  // Check if email is already associated with another user
  const existingUser = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email)
    .where("id", "!=", user.id)
    .executeTakeFirst();

  if (existingUser) {
    return {
      success: false,
      message: "이미 다른 계정에서 사용 중인 이메일입니다.",
    };
  }

  // Generate verification token
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await db.transaction().execute(async (trx) => {
      // Delete any existing verification tokens for this user
      await trx
        .deleteFrom("email_verification_tokens")
        .where("user_id", "=", user.id)
        .execute();

      // Insert new verification token
      await trx
        .insertInto("email_verification_tokens")
        .values({
          id: token,
          user_id: user.id,
          email,
          expires_at: expiresAt,
        })
        .execute();

      // Update user email (unverified)
      await trx
        .updateTable("users")
        .set({
          email,
          email_verified_at: null,
        })
        .where("id", "=", user.id)
        .execute();
    });

    // Send verification email
    await sendVerificationEmail(email, token);

    return {
      success: true,
      message: "인증 이메일이 발송되었습니다. 이메일을 확인해주세요.",
    };
  } catch (error) {
    console.error("Email association error:", error);
    return {
      success: false,
      message: "이메일 연결 중 오류가 발생했습니다.",
    };
  }
}

export async function verifyEmail(token: string) {
  const verificationToken = await db
    .selectFrom("email_verification_tokens")
    .selectAll()
    .where("id", "=", token)
    .where("expires_at", ">", new Date())
    .executeTakeFirst();

  if (!verificationToken) {
    return {
      success: false,
      message: "유효하지 않거나 만료된 인증 토큰입니다.",
    };
  }

  try {
    await db.transaction().execute(async (trx) => {
      // Mark email as verified with current timestamp
      await trx
        .updateTable("users")
        .set({
          email: verificationToken.email,
          email_verified_at: new Date(),
        })
        .where("id", "=", verificationToken.user_id)
        .execute();

      // Delete the verification token
      await trx
        .deleteFrom("email_verification_tokens")
        .where("id", "=", token)
        .execute();
    });

    return {
      success: true,
      message: "이메일이 성공적으로 인증되었습니다.",
    };
  } catch (error) {
    console.error("Email verification error:", error);
    return {
      success: false,
      message: "이메일 인증 중 오류가 발생했습니다.",
    };
  }
}

export async function resendVerificationEmail() {
  const { user } = await validateRequest();
  if (!user) {
    return {
      success: false,
      message: "로그인이 필요합니다.",
    };
  }

  if (user.email && user.emailVerifiedAt) {
    return {
      success: false,
      message: "이미 인증된 이메일입니다.",
    };
  }

  if (!user.email) {
    return {
      success: false,
      message: "연결된 이메일이 없습니다.",
    };
  }

  // Generate new verification token
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await db.transaction().execute(async (trx) => {
      // Delete any existing verification tokens for this user
      await trx
        .deleteFrom("email_verification_tokens")
        .where("user_id", "=", user.id)
        .execute();

      // Insert new verification token
      await trx
        .insertInto("email_verification_tokens")
        .values({
          id: token,
          user_id: user.id,
          email: user.email,
          expires_at: expiresAt,
        })
        .execute();
    });

    // Send verification email
    await sendVerificationEmail(user.email, token);

    return {
      success: true,
      message: "인증 이메일이 다시 발송되었습니다.",
    };
  } catch (error) {
    console.error("Resend verification email error:", error);
    return {
      success: false,
      message: "이메일 발송 중 오류가 발생했습니다.",
    };
  }
}
