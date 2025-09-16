import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import { hash, verify } from "@node-rs/argon2";

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { originalPassword, newPassword } = await request.json();

    if (!originalPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "기존 비밀번호와 새 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const databaseUser = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", user.id)
      .executeTakeFirst();

    if (!databaseUser) {
      return NextResponse.json(
        { success: false, message: "사용자가 존재하지 않습니다." },
        { status: 404 }
      );
    }

    const passwordVerified = await verify(
      databaseUser.password_hash,
      originalPassword
    );

    if (!passwordVerified) {
      return NextResponse.json(
        { success: false, message: "기존 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hash(newPassword);

    await db
      .updateTable("users")
      .set("password_hash", newPasswordHash)
      .where("id", "=", user.id)
      .execute();

    return NextResponse.json({
      success: true,
      message: "비밀번호가 변경되었습니다.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, message: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}