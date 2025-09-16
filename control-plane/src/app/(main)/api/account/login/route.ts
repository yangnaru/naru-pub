import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lucia, validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import { verify } from "@node-rs/argon2";

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();

    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const { login_name, password } = await request.json();

    if (!login_name || !password) {
      return NextResponse.json(
        { success: false, message: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const existingUser = await db
      .selectFrom("users")
      .selectAll()
      .where("login_name", "=", login_name)
      .executeTakeFirst();

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const passwordVerified = await verify(existingUser.password_hash, password);
    if (!passwordVerified) {
      return NextResponse.json(
        { success: false, message: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return NextResponse.json({
      success: true,
      message: "로그인되었습니다.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}