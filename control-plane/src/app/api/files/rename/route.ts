import { NextRequest, NextResponse } from "next/server";
import { renameFile } from "@/lib/actions/file";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldFilename, newFilename } = body;

    if (!oldFilename || !newFilename) {
      return NextResponse.json(
        { success: false, message: "기존 파일명과 새 파일명이 필요합니다." },
        { status: 400 }
      );
    }

    // Calculate new full path
    const pathParts = oldFilename.split('/');
    pathParts[pathParts.length - 1] = newFilename;
    const newPath = pathParts.join('/');

    const result = await renameFile(oldFilename, newPath);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json(
      { success: false, message: "파일 이름 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}