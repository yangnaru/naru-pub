import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/database";
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

    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { discoverable } = await request.json();

    if (typeof discoverable !== "boolean") {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 설정값입니다." },
        { status: 400 }
      );
    }

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("users")
        .set("discoverable", discoverable)
        .where("id", "=", user.id)
        .execute();

      await trx
        .updateTable("users")
        .set("site_updated_at", new Date())
        .where("id", "=", user.id)
        .execute();
    });

    return NextResponse.json({
      success: true,
      message: `공개 설정이 ${discoverable ? "활성화" : "비활성화"}되었습니다.`,
    });
  } catch (error) {
    console.error("Set discoverable error:", error);
    return NextResponse.json(
      { success: false, message: "설정 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}