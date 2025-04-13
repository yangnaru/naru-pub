import { db } from "@/lib/database";
import { getHomepageUrl, getRenderedSiteUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const recentlyRenderedUsers = await db
    .selectFrom("users")
    .selectAll()
    .where("discoverable", "=", true)
    .orderBy("site_updated_at", "desc")
    .where("site_rendered_at", "is not", null)
    .limit(99)
    .execute();

  return (
    <div className="flex flex-col gap-16">
      <p>당신의 공간이 되는, 나루.</p>
      <div className="flex flex-col gap-4">
        <h2 className="font-bold">설명서</h2>
        <p className="break-keep">사용자당 1GB의 저장 용량이 제공됩니다.</p>
        <p className="break-keep">
          크기가 큰 음악이나 영상은 되도록 SoundCloud나 YouTube로 게시해 주세요.
        </p>
        <p className="break-keep">
          트래픽을 과도하게 유발하는 행위는 자제해 주세요.
        </p>
        <p className="break-keep">
          나루는 비영리 서비스이며, 사용상 발생하는 문제에 대해 어떠한 책임도
          지지 않습니다.
        </p>
        <p className="break-keep">
          문의는{" "}
          <Link href="https://x.com/naru_pub" className="text-blue-500">
            @naru_pub
          </Link>{" "}
          으로 부탁드립니다.
        </p>
        <p className="break-keep">그럼, 즐거운 하루 되세요!</p>
      </div>

      {recentlyRenderedUsers.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold">최근 업데이트된</h2>
          <ol className="flex flex-row flex-wrap gap-2">
            {recentlyRenderedUsers.map((user) => {
              const homepageUrl = getHomepageUrl(user.login_name);

              return (
                <li key={user.id} className="flex flex-col gap-2">
                  <Link href={homepageUrl} target="_blank">
                    <Image
                      src={getRenderedSiteUrl(user.login_name)}
                      alt="screenshot"
                      width={320}
                      height={240}
                    />
                  </Link>
                  <Button variant="outline" asChild>
                    <Link href={homepageUrl} target="_blank">
                      {user.login_name}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
