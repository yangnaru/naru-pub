import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lucia, validateRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { session } = await validateRequest();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    await lucia.invalidateSession(session.id);

    const sessionCookie = lucia.createBlankSessionCookie();
    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return NextResponse.json({
      success: true,
      message: "로그아웃되었습니다.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "로그아웃 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}