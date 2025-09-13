import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { buildFileTree } from "@/lib/fileUtils";

export async function GET() {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
    }

    const fileTree = await buildFileTree(user.loginName);
    
    return NextResponse.json({ success: true, files: fileTree });
  } catch (error) {
    console.error("File tree error:", error);
    return NextResponse.json(
      { success: false, message: "파일 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}