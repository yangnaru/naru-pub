import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { sendPasswordResetEmail, generatePasswordResetToken } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    // Find user with verified email
    const user = await db
      .selectFrom("users")
      .select(["id", "login_name", "email", "email_verified_at"])
      .where("email", "=", email)
      .where("email_verified_at", "is not", null)
      .executeTakeFirst();

    if (!user) {
      // Don't reveal whether email exists for security
      return NextResponse.json({
        success: true,
        message: "비밀번호 재설정 링크가 이메일로 발송되었습니다.",
      });
    }

    // Generate reset token
    const token = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.transaction().execute(async (trx) => {
      // Delete any existing password reset tokens for this user
      await trx
        .deleteFrom("password_reset_tokens")
        .where("user_id", "=", user.id)
        .execute();

      // Insert new password reset token
      await trx
        .insertInto("password_reset_tokens")
        .values({
          id: token,
          user_id: user.id,
          email: user.email!,
          expires_at: expiresAt,
        })
        .execute();
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email!, token);

    return NextResponse.json({
      success: true,
      message: "비밀번호 재설정 링크가 이메일로 발송되었습니다.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { success: false, message: "비밀번호 재설정 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}