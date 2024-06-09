"use server";

import fs from "fs";
import path from "path";
import { validateRequest } from "../auth";
import { EDITABLE_FILE_EXTENSIONS } from "../const";
import { revalidatePath } from "next/cache";

export async function saveFile(filename: string, contents: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  if (filename.includes("..")) {
    return { success: false, message: "잘못된 파일 이름입니다." };
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

  if (filename.includes("..")) {
    return { success: false, message: "잘못된 파일 이름입니다." };
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

  return true;
}

export async function uploadFile(prevState: any, formData: FormData) {
  const { user } = await validateRequest();

  if (!user) {
    return { message: "로그인이 필요합니다." };
  }

  const file = formData.get("file") as File;
  const directory = formData.get("directory") as string;

  if (directory.includes("..")) {
    return { success: false, message: "잘못된 경로입니다." };
  }

  if (file.name.includes("..")) {
    return { success: false, message: "잘못된 파일 이름입니다." };
  }

  if (file.size === 0) {
    return { message: "빈 파일은 업로드할 수 없습니다." };
  }

  if (file.size > 1024 * 1024 * 10) {
    return { message: "10MB 이하의 파일만 업로드할 수 있습니다." };
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

  return { success: true, message: "업로드되었습니다." };
}

export async function createDirectory(directory: string) {
  const { user } = await validateRequest();

  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  // Check for path traversal in directory
  if (directory.includes("..")) {
    return { success: false, message: "잘못된 파일 이름입니다." };
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

  // Check for path traversal in filename
  if (filename.includes("..")) {
    return { success: false, message: "잘못된 파일 이름입니다." };
  }

  const extension = filename.split(".").pop();
  if (!extension) {
    return { success: false, message: "확장자를 입력해주세요." };
  }

  if (!EDITABLE_FILE_EXTENSIONS.includes(extension)) {
    return {
      success: false,
      message: `지원하지 않는 파일 형식입니다. ${EDITABLE_FILE_EXTENSIONS.join(
        ", "
      )} 파일만 생성할 수 있습니다.`,
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

  return {
    success: true,
    message: "파일이 생성되었습니다.",
  };
}
