import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <p>당신의 공간이 되는, 나루.</p>
      <div className="flex flex-col gap-4">
        <h2 className="font-bold">설명서</h2>
        <p>사용자당 1GB의 저장 용량이 제공됩니다.</p>
        <p>크기가 큰 음악이나 영상은 되도록 SoundCloud나 YouTube로 게시하고,</p>
        <p>트래픽을 과도하게 유발하는 행위는 자제해 주세요.</p>
        <p>
          나루는 비영리 서비스이며, 사용상 발생하는 문제에 대해 어떠한 책임도
          지지 않습니다.
        </p>
        <p>
          문의는{" "}
          <Link href="https://x.com/naru_pub" className="text-blue-500">
            @naru_pub
          </Link>{" "}
          으로 부탁드립니다.
        </p>
        <p>그럼, 즐거운 하루 되세요!</p>
      </div>
    </div>
  );
}
