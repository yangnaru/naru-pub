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
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="bg-secondary border-b-2 border-border">
            <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
              📖 소개
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-muted-foreground text-base leading-relaxed">
              <strong className="text-primary">나루</strong>는 누구나 무료로
              사용할 수 있는 비영리 웹사이트 호스팅 서비스입니다.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              개인 홈페이지나 블로그를 손쉽게 만들고 공유할 수 있도록
              도와드립니다.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="bg-secondary border-b-2 border-border">
            <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
              📋 사용 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3 text-muted-foreground">
              <div className="bg-background border border-border rounded p-3">
                <strong className="text-foreground">💾 저장공간:</strong> 사용자당
                1GB의 저장 용량이 제공됩니다.
              </div>

              <div className="bg-background border border-border rounded p-3">
                <strong className="text-foreground">🎵 미디어:</strong> 크기가 큰
                음악이나 영상은 되도록 SoundCloud나 YouTube로 게시해 주세요.
              </div>

              <div className="bg-background border border-border rounded p-3">
                <strong className="text-foreground">⚠️ 주의:</strong> 트래픽을
                과도하게 유발하는 행위는 자제해 주세요.
              </div>

              <div className="bg-background border border-border rounded p-3">
                <strong className="text-foreground">ℹ️ 면책:</strong> 나루는
                비영리 서비스이며, 사용상 발생하는 문제에 대해 어떠한 책임도
                지지 않습니다.
              </div>

              <div className="bg-background border border-border rounded p-3">
                <strong className="text-foreground">📞 문의:</strong> 문의는{" "}
                <Link
                  href="https://x.com/naru_pub"
                  className="text-primary underline hover:text-primary/80"
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
            imageAlt="타이포 블루 캐릭터"
            description="텍스트 전용 블로깅 플랫폼, 타이포 블루"
            subtitle="자신의 글을 메일링과 연합우주를 통해 발행하세요!"
            buttonText="글 쓰러 가기 →"
            buttonHref="https://typo.blue"
          />
          <AdCard
            icon="🐓"
            title="커뮹!"
            label="동맹 사이트 광고"
            imageSrc="/ad/8eb6bc2c4a2b73696ad1788fb98a6d59c8a3c21a15ddd418b1bf38800c65f317.png"
            imageAlt="커뮹! 캐릭터"
            description="마스토돈 스타일의 커뮤 플랫폼, 커뮹!"
            subtitle="편리한 총괄, 간편한 러닝! 커뮤 뛰러 오세요!"
            buttonText="커뮤 뛰러 가기 →"
            buttonHref="https://commu.ng"
          />
          <AdCard
            icon="👀"
            title="광고주를 찾고 있습니다"
            label="당신의 광고"
            imageSrc="/ad/0c88af5cb6aee0da1e19b8c7f75ee6a1fc11cda46729b5734f4cf2e45c65bede.png"
            imageAlt="귀여운 고양이"
            description="이 자리에 들어갈 광고를 찾고 있습니다"
            subtitle="광고 문의는 DM으로 부탁드립니다!"
            buttonText="광고 문의하러 가기 →"
            buttonHref="https://x.com/naru_pub"
          />
        </div>

        {recentlyRenderedUsers.length > 0 && (
          <Card className="bg-card border-2 border-border shadow-lg">
            <CardHeader className="bg-secondary border-b-2 border-border">
              <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
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
                      className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <Link
                        href={homepageUrl}
                        target="_blank"
                        className="block"
                      >
                        <div className="border border-border rounded mb-3 overflow-hidden">
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
                          className="w-full border-border text-muted-foreground hover:bg-background bg-card"
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
