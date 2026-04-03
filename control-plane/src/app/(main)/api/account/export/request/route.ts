import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { assertJsonContentType } from "@/lib/utils";
import { db } from "@/lib/database";
import { sql } from "kysely";

export async function POST(request: NextRequest) {
  try {
    assertJsonContentType(request);

    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    if (!user.email || !user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "갠홈 내보내기를 이용하려면 이메일 인증이 필요합니다." },
        { status: 400 }
      );
    }

    // Debounce: reject if pending/in_progress or completed within last hour
    const recentExport = await db
      .selectFrom("home_directory_exports")
      .selectAll()
      .where("user_id", "=", user.id)
      .where((eb) =>
        eb.or([
          eb("status", "in", ["pending", "in_progress"]),
          eb.and([
            eb("status", "=", "completed"),
            eb("created_at", ">", sql<Date>`now() - interval '1 hour'`),
          ]),
        ])
      )
      .executeTakeFirst();

    if (recentExport) {
      return NextResponse.json(
        {
          error:
            "이미 내보내기가 진행 중이거나 최근에 완료되었습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    await db
      .insertInto("home_directory_exports")
      .values({
        user_id: user.id,
        status: "pending",
      })
      .execute();

    return NextResponse.json({
      success: true,
      message:
        "갠홈 내보내기가 요청되었습니다. 완료되면 이메일로 알려드리겠습니다.",
    });
  } catch (error) {
    console.error("Export request error:", error);
    return NextResponse.json(
      { error: "내보내기 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
