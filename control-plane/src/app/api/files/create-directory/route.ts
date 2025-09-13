import { NextRequest, NextResponse } from "next/server";
import { createDirectory } from "@/lib/actions/file";

export async function POST(request: NextRequest) {
  try {
    const { directory } = await request.json();
    const result = await createDirectory(directory);
    
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Create directory error:", error);
    return NextResponse.json(
      { success: false, message: "디렉토리 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}