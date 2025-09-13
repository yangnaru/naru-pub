import { NextRequest, NextResponse } from "next/server";
import { createFile } from "@/lib/actions/file";

export async function POST(request: NextRequest) {
  try {
    const { directory, filename } = await request.json();
    const result = await createFile(directory, filename);
    
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Create file error:", error);
    return NextResponse.json(
      { success: false, message: "파일 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}