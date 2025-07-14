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

async function invalidateCloudflareCacheSingleFile(
  user: User,
  filename: string
) {
  // Invalidate Cloudflare cache
  // Purge Cached Content: POST /zones/{zone_id}/purge_cache
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
  return response.ok;
}

function validateFilename(filename: string) {
  // Length validation
  if (filename.length > 255) {
    throw new Error("파일명이 너무 깁니다. (최대 255자)");
  }
  
  if (filename.length === 0) {
    throw new Error("파일명이 비어있습니다.");
  }
    
  // Reserved names on Windows
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    throw new Error("예약된 파일명입니다.");
  }
}

function assertNoPathTraversal(filename: string) {
  // Normalize and validate path
  const normalized = filename.replace(/\\/g, '/').replace(/\/+/g, '/');
  
  if (normalized.includes("..") || 
      normalized.startsWith("/") || 
      normalized.includes("\0") ||
      /[<>:"|?*]/.test(filename) ||
      /%2e%2e/i.test(filename)) {
    throw new Error("잘못된 경로입니다.");
  }
  
  // Try to decode and check for path traversal
  try {
    const decoded = decodeURIComponent(filename);
    if (/\.\./g.test(decoded)) {
      throw new Error("잘못된 경로입니다.");
    }
    // Double decode for cases like %252e%252e
    try {
      const doubleDecoded = decodeURIComponent(decoded);
      if (/\.\./g.test(doubleDecoded)) {
        throw new Error("잘못된 경로입니다.");
      }
    } catch (e) {
      // If double decoding fails, ignore
    }
  } catch (decodeError) {
    // If decoding fails, it's likely malformed - allow it to pass this check
  }
}

function assertAllowedFilename(filename: string) {
  validateFilename(filename);
  
  const parts = filename.split(".");
  if (parts.length < 2) {
    throw new Error("확장자를 입력해주세요.");
  }
  
  const extension = parts[parts.length - 1].toLowerCase();
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
  validateFilename(filename);
  
  const parts = filename.split(".");
  if (parts.length < 2) {
    throw new Error("확장자를 입력해주세요.");
  }
  
  const extension = parts[parts.length - 1].toLowerCase();
  if (!extension) {
    throw new Error("확장자를 입력해주세요.");
  }

  if (!EDITABLE_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `지원하지 않는 파일 형식입니다. ${EDITABLE_FILE_EXTENSIONS.join(
        ", "
      )} 파일만 편집할 수 있습니다.`
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

  try {
    await invalidateCloudflareCacheSingleFile(user, filename);
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

    for (const obj of objects.Contents ?? []) {
      if (obj.Key) {
        // Extract filename from S3 key safely
        const keyParts = obj.Key.split('/');
        const filename = keyParts[keyParts.length - 1];
        await invalidateCloudflareCacheSingleFile(user, filename);
      }
    }
  } catch (e) {
    Sentry.captureException(e);

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

  try {
    assertNoPathTraversal(filename);
    assertNoPathTraversal(newFilename);
    validateFilename(newFilename);
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  if (filename === "/index.html") {
    return {
      success: false,
      message: "홈 페이지 이름은 변경할 수 없습니다.",
    };
  }

  try {
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

    await invalidateCloudflareCacheSingleFile(user, filename);
    await invalidateCloudflareCacheSingleFile(user, newFilename);

    revalidatePath("/files", "layout");
    await updateSiteUpdatedAt(user);
    return {
      success: true,
      message: "파일 이름이 변경되었습니다.",
    };
  } catch (e) {
    Sentry.captureException(e);
    return {
      success: false,
      message: "파일 이름 변경에 실패했습니다.",
    };
  }
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
    if (directory.length > 1000) {
      throw new Error("디렉토리 경로가 너무 깁니다.");
    }
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

    // Extract filename from S3 key safely for cache invalidation
    const keyParts = key.split('/');
    const filename = keyParts[keyParts.length - 1];
    await invalidateCloudflareCacheSingleFile(user, filename);
  } catch (e) {
    Sentry.captureException(e);

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

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return { success: true, message: "업로드되었습니다." };
}

export async function createDirectory(directory: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  try {
    assertNoPathTraversal(directory);
    if (directory.length > 1000) {
      throw new Error("디렉토리 경로가 너무 깁니다.");
    }
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
    if (directory.length > 1000) {
      throw new Error("디렉토리 경로가 너무 깁니다.");
    }
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  const key = `${getUserHomeDirectory(user.loginName)}/${directory}/${filename}`
    .replaceAll("///", "/")
    .replaceAll("//", "/");
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
      })
    );

    return {
      success: false,
      message: "이미 존재하는 파일입니다.",
    };
  } catch (e) {
    if (e instanceof NotFound) {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
            Body: "", // Create empty file
            ContentType:
              FILE_EXTENSION_MIMETYPE_MAP[filename.split(".").pop()!],
          })
        );

        revalidatePath("/files", "layout");
        await updateSiteUpdatedAt(user);
        return {
          success: true,
          message: "파일이 생성되었습니다.",
        };
      } catch (e) {
        Sentry.captureException(e);
        return {
          success: false,
          message: "파일 생성에 실패했습니다.",
        };
      }
    }

    Sentry.captureException(e);
    return {
      success: false,
      message: "파일 생성에 실패했습니다.",
    };
  }
}
