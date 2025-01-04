"use server";

import {
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  NotFound,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { validateRequest } from "../auth";
import {
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_INDEX_HTML,
  EDITABLE_FILE_EXTENSIONS,
  FILE_EXTENSION_MIMETYPE_MAP,
} from "../const";
import { revalidatePath } from "next/cache";
import { db } from "../database";
import { User } from "lucia";
import * as Sentry from "@sentry/nextjs";
import { getUserHomeDirectory, s3Client } from "../utils";

function assertNoPathTraversal(filename: string) {
  if (filename.includes("..")) {
    throw new Error("잘못된 경로입니다.");
  }
}

function assertAllowedFilename(filename: string) {
  const extension = filename.split(".").pop();
  if (!extension) {
    throw new Error("확장자를 입력해주세요.");
  }

  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `지원하지 않는 파일 형식입니다. ${ALLOWED_FILE_EXTENSIONS.join(
        ", "
      )} 파일만 생성할 수 있습니다.`
    );
  }
}

function assertEditableFilename(filename: string) {
  const extension = filename.split(".").pop();
  if (!extension) {
    throw new Error("확장자를 입력해주세요.");
  }

  if (!EDITABLE_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `지원하지 않는 파일 형식입니다. ${EDITABLE_FILE_EXTENSIONS.join(
        ", "
      )} 파일만 생성할 수 있습니다.`
    );
  }
}

async function updateSiteUpdatedAt(user: User) {
  return await db
    .updateTable("users")
    .set({
      site_updated_at: new Date(),
    })
    .where("users.id", "=", user.id)
    .execute();
}

export async function saveFile(filename: string, contents: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  try {
    assertNoPathTraversal(filename);
    assertEditableFilename(filename);
  } catch (e: any) {
    return { success: false, message: e.message };
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
    return {
      success: false,
      message: "파일 저장에 실패했습니다.",
    };
  }

  try {
    await updateSiteUpdatedAt(user);
  } catch (e) {
    Sentry.captureException(e);
  }

  return {
    success: true,
    message: "파일이 저장되었습니다.",
  };
}

export async function deleteFile(filename: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  try {
    assertNoPathTraversal(filename);
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  if (filename === "/index.html") {
    return {
      success: false,
      message: "홈 페이지는 삭제할 수 없습니다.",
    };
  }

  const key = `${getUserHomeDirectory(user.loginName)}/${filename}`.replaceAll(
    "//",
    "/"
  );

  try {
    // List all objects with the prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: key,
    });
    const objects = await s3Client.send(listCommand);

    // Delete all objects with the prefix
    if (objects.Contents && objects.Contents.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Delete: {
            Objects: objects.Contents.map((obj) => ({ Key: obj.Key! })),
          },
        })
      );
    }
  } catch (e) {
    return {
      success: false,
      message: "파일 삭제에 실패했습니다.",
    };
  }

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return {
    success: true,
    message: "파일이 삭제되었습니다.",
  };
}

export async function renameFile(filename: string, newFilename: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  assertNoPathTraversal(filename);
  assertNoPathTraversal(newFilename);

  if (filename === "/index.html") {
    return {
      success: false,
      message: "홈 페이지 이름은 변경할 수 없습니다.",
    };
  }

  // Copy the object to new location
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      CopySource: `${process.env.S3_BUCKET_NAME}/${getUserHomeDirectory(
        user.loginName
      )}/${filename}`,
      Key: `${getUserHomeDirectory(user.loginName)}/${newFilename}`,
    })
  );

  // Delete the old object
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: `${getUserHomeDirectory(user.loginName)}/${filename}`,
    })
  );

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return {
    success: true,
    message: "파일 이름이 변경되었습니다.",
  };
}

async function uploadSingleFile(user: User, directory: string, file: File) {
  if (file.size === 0) {
    return { message: "빈 파일은 업로드할 수 없습니다." };
  }

  if (file.size > 1024 * 1024 * 10) {
    return { message: "10MB 이하의 파일만 업로드할 수 있습니다." };
  }

  try {
    assertNoPathTraversal(directory);
    assertAllowedFilename(file.name);
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  const data = await file.arrayBuffer();
  const key = `${getUserHomeDirectory(user.loginName)}/${directory}${
    file.name
  }`.replaceAll("//", "/");
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(data),
        ContentType: FILE_EXTENSION_MIMETYPE_MAP[file.name.split(".").pop()!],
      })
    );
  } catch (e) {
    return {
      success: false,
      message: "파일 업로드에 실패했습니다.",
    };
  }

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return { success: true, message: "업로드되었습니다." };
}

export async function uploadFile(prevState: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { message: "로그인이 필요합니다." };
  }

  const directory = formData.get("directory") as string;
  const files = formData.getAll("file") as File[];

  if (!files.length) {
    return { message: "파일을 선택해주세요." };
  }

  for (const file of files) {
    const result = await uploadSingleFile(user, directory, file);
    if (!result.success) {
      return result;
    }
  }

  return { success: true, message: "업로드되었습니다." };
}

export async function createDirectory(directory: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  try {
    assertNoPathTraversal(directory);
  } catch (e: any) {
    return { success: false, message: e.message };
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
        return {
          success: false,
          message: "파일 생성에 실패했습니다.",
        };
      }
    }
  }

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return {
    success: true,
    message: "폴더가 생성되었습니다.",
  };
}

export async function createFile(directory: string, filename: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  try {
    assertNoPathTraversal(directory);
    assertNoPathTraversal(filename);
    assertEditableFilename(filename);
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  const key = `${getUserHomeDirectory(
    user.loginName
  )}/${directory}/${filename}`.replaceAll("//", "/");
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch (e) {
    if (e instanceof NotFound) {
      revalidatePath("/files", "layout");
      await updateSiteUpdatedAt(user);
      return {
        success: true,
        message: "파일이 생성되었습니다.",
      };
    }

    return {
      success: false,
      message: "파일 생성에 실패했습니다.",
    };
  }
}
