import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import Image from "next/image";
import { Toaster } from "@/components/ui/toaster";
import { getHomepageUrl } from "@/lib/utils";

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
  const { user } = await getCurrentSession();

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
                <Link href="/">소개</Link>
              </li>
              {user ? (
                <>
                  <li>
                    <Link href="/files">파일</Link>
                  </li>
                  <li>
                    <Link href="/account">계정</Link>
                  </li>
                  <li>
                    <Link
                      href={getHomepageUrl(user.loginName)}
                      target="_blank"
                      className="text-blue-500"
                    >
                      {getHomepageUrl(user.loginName)}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login">로그인</Link>
                  </li>
                  <li>
                    <Link href="/signup">회원가입</Link>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
