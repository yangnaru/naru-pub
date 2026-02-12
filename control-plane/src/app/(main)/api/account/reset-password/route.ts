import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { hash } from "@node-rs/argon2";
import { assertJsonContentType } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    try {
      assertJsonContentType(request);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid content type" },
        { status: 400 }
      );
    }

    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "토큰과 새 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    const resetToken = await db
      .selectFrom("password_reset_tokens")
      .selectAll()
      .where("id", "=", token)
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

    if (!resetToken) {
      return NextResponse.json(
        { success: false, message: "유효하지 않거나 만료된 비밀번호 재설정 토큰입니다." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hash(newPassword);

    await db.transaction().execute(async (trx) => {
      // Update user password
      await trx
        .updateTable("users")
        .set("password_hash", newPasswordHash)
        .where("id", "=", resetToken.user_id)
        .execute();

      // Delete the password reset token
      await trx
        .deleteFrom("password_reset_tokens")
        .where("id", "=", token)
        .execute();

      // Invalidate all existing sessions for security
      await trx
        .deleteFrom("sessions")
        .where("user_id", "=", resetToken.user_id)
        .execute();
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { success: false, message: "비밀번호 재설정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}