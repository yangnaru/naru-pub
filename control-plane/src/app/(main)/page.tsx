import { db } from "@/lib/database";
import { getHomepageUrl, getRenderedSiteUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Card className="bg-white border-2 border-gray-300 shadow-lg">
          <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
            <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
              📖 소개
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-gray-700 text-base leading-relaxed">
              <strong className="text-blue-800">나루</strong>는 누구나 무료로
              사용할 수 있는 비영리 웹사이트 호스팅 서비스입니다.
            </p>
            <p className="text-gray-700 text-base leading-relaxed">
              개인 홈페이지나 블로그를 손쉽게 만들고 공유할 수 있도록
              도와드립니다.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-gray-300 shadow-lg">
          <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
            <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
              📋 사용 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3 text-gray-700">
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <strong className="text-gray-800">💾 저장공간:</strong> 사용자당
                1GB의 저장 용량이 제공됩니다.
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <strong className="text-gray-800">🎵 미디어:</strong> 크기가 큰
                음악이나 영상은 되도록 SoundCloud나 YouTube로 게시해 주세요.
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <strong className="text-gray-800">⚠️ 주의:</strong> 트래픽을
                과도하게 유발하는 행위는 자제해 주세요.
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <strong className="text-gray-800">ℹ️ 면책:</strong> 나루는
                비영리 서비스이며, 사용상 발생하는 문제에 대해 어떠한 책임도
                지지 않습니다.
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <strong className="text-gray-800">📞 문의:</strong> 문의는{" "}
                <Link
                  href="https://x.com/naru_pub"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  @naru_pub
                </Link>{" "}
                으로 부탁드립니다.
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
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
          <Card className="bg-white border-2 border-gray-300 shadow-lg">
            <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
              <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
                🔄 최근 업데이트된
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recentlyRenderedUsers.map((user) => {
                  const homepageUrl = getHomepageUrl(user.login_name);

                  return (
                    <div
                      key={user.id}
                      className="bg-white border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <Link
                        href={homepageUrl}
                        target="_blank"
                        className="block"
                      >
                        <div className="border border-gray-300 rounded mb-3 overflow-hidden">
                          <Image
                            src={getRenderedSiteUrl(user.login_name)}
                            alt="screenshot"
                            width={320}
                            height={240}
                            className="w-full h-auto hover:opacity-90 transition-opacity"
                          />
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                        >
                          {user.login_name}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
