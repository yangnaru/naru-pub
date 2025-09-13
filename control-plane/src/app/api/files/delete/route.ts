import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/actions/file";

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();
    const result = await deleteFile(filename);
    
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, message: "파일 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}