import { db } from "@/lib/database";
import { getHomepageUrl, getRenderedSiteUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AdCard } from "@/components/AdCard";

export default async function Home() {
  const recentlyRenderedUsers = await db
    .selectFrom("users")
    .selectAll()
    .where("discoverable", "=", true)
    .orderBy("site_updated_at", "desc")
    .where("site_rendered_at", "is not", null)
    .limit(100)
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

      <div className="flex flex-col sm:flex-row gap-4">
        <AdCard
          icon="🥒"
          title="오이카페"
          label="동맹 사이트 광고"
          imageSrc="/ad/8f1572d356a332381c53e1f7e6b77afb0e64f1bdb6a4b46c76a6bb6f5a680a30.png"
          imageAlt="오이카페 캐릭터"
          description="2000년도 감성의 웹 그림판, 오이카페"
          subtitle="오에카키 스타일로 그림을 그리고 넷캔도 즐겨보세요!"
          buttonText="오이 깎으러 가기 →"
          buttonHref="https://oeee.cafe"
        />
        <AdCard
          icon="🖋️"
          title="타이포 블루"
          label="동맹 사이트 광고"
          imageSrc="/ad/1339fc50a058b6d7f6a782c76d61839262459bd47c8e37c7421cc14b28bbfdba.png"
          imageAlt="푸른 배경"
          description="텍스트 전용 블로깅 플랫폼, 타이포 블루"
          subtitle="자신의 글을 메일링과 연합우주를 통해 발행하세요!"
          buttonText="글 쓰러 가기 →"
          buttonHref="https://typo.blue"
        />
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
