import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "인증 토큰이 필요합니다." },
        { status: 400 }
      );
    }

    const verificationToken = await db
      .selectFrom("email_verification_tokens")
      .selectAll()
      .where("id", "=", token)
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: "유효하지 않거나 만료된 인증 토큰입니다." },
        { status: 400 }
      );
    }

    await db.transaction().execute(async (trx) => {
      // Mark email as verified with current timestamp
      await trx
        .updateTable("users")
        .set({
          email: verificationToken.email,
          email_verified_at: new Date(),
        })
        .where("id", "=", verificationToken.user_id)
        .execute();

      // Delete the verification token
      await trx
        .deleteFrom("email_verification_tokens")
        .where("id", "=", token)
        .execute();
    });

    return NextResponse.json({
      success: true,
      message: "이메일이 성공적으로 인증되었습니다.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, message: "이메일 인증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}