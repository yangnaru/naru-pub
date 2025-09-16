import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
import { sendAccountDeletionEmail, generateAccountDeletionToken } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // If user has no verified email, require immediate deletion with JavaScript confirmation
    if (!user.email || !user.emailVerifiedAt) {
      return NextResponse.json({
        success: true,
        requiresImmediateConfirmation: true,
        message: "이메일 인증이 없어 즉시 삭제됩니다. 확인하시겠습니까?",
      });
    }

    // Generate deletion token for users with verified email
    const token = generateAccountDeletionToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.transaction().execute(async (trx) => {
      // Delete any existing account deletion tokens for this user
      await trx
        .deleteFrom("account_deletion_tokens")
        .where("user_id", "=", user.id)
        .execute();

      // Insert new account deletion token
      await trx
        .insertInto("account_deletion_tokens")
        .values({
          id: token,
          user_id: user.id,
          email: user.email!,
          expires_at: expiresAt,
        })
        .execute();
    });

    // Send account deletion confirmation email
    await sendAccountDeletionEmail(user.email!, token);

    return NextResponse.json({
      success: true,
      requiresImmediateConfirmation: false,
      message: "계정 삭제 확인 이메일이 발송되었습니다. 이메일을 확인해주세요.",
    });
  } catch (error) {
    console.error("Account deletion request error:", error);
    return NextResponse.json(
      { success: false, message: "계정 삭제 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}