import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { validateRequest } from "@/lib/auth";
import Image from "next/image";

const inter = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "나루",
  description: "당신의 공간이 되는, 나루.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await validateRequest();

  const homepageUrl =
    process.env.NODE_ENV === "production"
      ? `https://${user?.loginName}.${process.env.NEXT_PUBLIC_DOMAIN}`
      : `http://${user?.loginName}.${process.env.NEXT_PUBLIC_DOMAIN}`;

  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="container mx-auto p-10">
          <nav className="pb-10">
            <Link href="/" className="flex flex-row gap-2 items-center">
              <h1 className="text-4xl">나루</h1>
              <Image src="/logo.png" alt="logo" width={32} height={32} />
            </Link>
            <ul className="flex flex-row gap-2 py-5">
              <li>
                <a href="/">소개</a>
              </li>
              {user ? (
                <>
                  <li>
                    <a href="/files">파일</a>
                  </li>
                  <li>
                    <a href="/account">계정</a>
                  </li>
                  <li>
                    <a href={homepageUrl} className="text-blue-500">
                      {homepageUrl}
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a href="/login">로그인</a>
                  </li>
                  <li>
                    <a href="/signup">회원가입</a>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {children}
        </div>
      </body>
    </html>
  );
}
