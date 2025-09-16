import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/actions/file";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await uploadFile(null, formData);
    
    // Handle inconsistent return types from uploadFile
    if ('success' in result) {
      // Result has success property
      if (result.success) {
        return NextResponse.json({ success: true, message: result.message });
      } else {
        return NextResponse.json({ success: false, message: result.message }, { status: 400 });
      }
    } else {
      // Result only has message property (error case)
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}