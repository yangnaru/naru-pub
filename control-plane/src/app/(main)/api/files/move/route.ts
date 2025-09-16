import { NextRequest, NextResponse } from "next/server";
import { renameFile } from "@/lib/actions/file";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { validateRequest } from "@/lib/auth";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcePath, targetDirectory } = body;

    if (!sourcePath) {
      return NextResponse.json(
        { success: false, message: "소스 파일 경로가 필요합니다." },
        { status: 400 }
      );
    }

    // Get filename from source path
    const fileName = sourcePath.split('/').pop();
    if (!fileName) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 파일 경로입니다." },
        { status: 400 }
      );
    }

    // Calculate new path
    const newPath = targetDirectory ? `${targetDirectory}/${fileName}` : fileName;

    // If source and target are the same, no need to move
    if (sourcePath === newPath) {
      return NextResponse.json(
        { success: true, message: "파일이 이미 해당 위치에 있습니다." }
      );
    }

    // Check if a file already exists at the target location
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `${getUserHomeDirectory(user.loginName)}/${newPath}`,
        })
      );

      // If we reach here, the file exists
      return NextResponse.json(
        {
          success: false,
          message: `"${fileName}" 파일이 대상 위치에 이미 존재합니다.`,
          type: "FILE_EXISTS"
        },
        { status: 409 }
      );
    } catch (error: any) {
      // If error is NotFound, the file doesn't exist - we can proceed
      if (error.name !== "NotFound") {
        throw error; // Re-throw other errors
      }
    }

    const result = await renameFile(sourcePath, newPath);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `파일이 성공적으로 이동되었습니다.`,
        newPath
      });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Move file error:", error);
    return NextResponse.json(
      { success: false, message: "파일 이동에 실패했습니다." },
      { status: 500 }
    );
  }
}