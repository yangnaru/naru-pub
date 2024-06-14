"use server";

import fs from "fs";
import path from "path";
import { validateRequest } from "../auth";
import { ALLOWED_FILE_EXTENSIONS, EDITABLE_FILE_EXTENSIONS } from "../const";
import { revalidatePath } from "next/cache";
import { db } from "../database";
import { User } from "lucia";

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
    fs.writeFileSync(
      path.join(process.env.USER_HOME_DIRECTORY!, user.loginName, filename),
      contents
    );
  } catch (e) {
    return {
      success: false,
      message: "파일 저장에 실패했습니다.",
    };
  }

  await updateSiteUpdatedAt(user);
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

  try {
    fs.rmSync(
      path.join(process.env.USER_HOME_DIRECTORY!, user.loginName, filename),
      {
        recursive: true,
      }
    );
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

  try {
    assertNoPathTraversal(filename);
    assertNoPathTraversal(newFilename);

    if (filename === "/index.html") {
      return {
        success: false,
        message: "홈 페이지 이름은 변경할 수 없습니다.",
      };
    }

    const stats = fs.statSync(
      path.join(process.env.USER_HOME_DIRECTORY!, user.loginName, filename)
    );
    if (!stats.isDirectory()) {
      try {
        assertAllowedFilename(newFilename);
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }

    fs.renameSync(
      path.join(process.env.USER_HOME_DIRECTORY!, user.loginName, filename),
      path.join(process.env.USER_HOME_DIRECTORY!, user.loginName, newFilename)
    );
  } catch (e) {
    return {
      success: false,
      message: "파일 이름 변경에 실패했습니다.",
    };
  }

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return {
    success: true,
    message: "파일 이름이 변경되었습니다.",
  };
}

export async function uploadFile(prevState: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { message: "로그인이 필요합니다." };
  }

  const file = formData.get("file") as File;
  const directory = formData.get("directory") as string;

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
  try {
    fs.writeFileSync(
      path.join(
        process.env.USER_HOME_DIRECTORY!,
        user.loginName,
        directory,
        file.name
      ),
      Buffer.from(data)
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

  try {
    fs.mkdirSync(
      path.join(process.env.USER_HOME_DIRECTORY!, user.loginName, directory)
    );
  } catch (e) {
    return {
      success: false,
      message: "파일 생성에 실패했습니다.",
    };
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

  if (
    fs.existsSync(
      path.join(
        process.env.USER_HOME_DIRECTORY!,
        user.loginName,
        directory,
        filename
      )
    )
  ) {
    return {
      success: false,
      message: "이미 존재하는 파일입니다.",
    };
  }

  try {
    fs.writeFileSync(
      path.join(
        process.env.USER_HOME_DIRECTORY!,
        user.loginName,
        directory,
        filename
      ),
      ""
    );
  } catch (e) {
    return {
      success: false,
      message: "파일 생성에 실패했습니다.",
    };
  }

  revalidatePath("/files", "layout");
  await updateSiteUpdatedAt(user);
  return {
    success: true,
    message: "파일이 생성되었습니다.",
  };
}
