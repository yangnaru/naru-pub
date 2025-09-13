import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { validateRequest } from "@/lib/auth";
import Image from "next/image";
import { Toaster } from "@/components/ui/toaster";
import { getHomepageUrl } from "@/lib/utils";

const korean = IBM_Plex_Sans_KR({
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

  return (
    <html lang="ko">
      <body className={korean.className}>
        <div className="bg-gray-50 min-h-screen">
          <nav className="bg-white border-b-2 border-gray-300 ">
            <div className="max-w-4xl mx-auto p-4">
              <Link href="/" className="flex flex-row gap-3 items-center mb-4">
                <h1 className="text-3xl font-bold text-gray-800 drop-">
                  나루
                </h1>
                <Image
                  src="/logo.png"
                  alt="logo"
                  width={28}
                  height={28}
                  className="drop-"
                />
              </Link>

              <ul className="flex flex-row gap-4 text-sm">
                <li>
                  <Link
                    href="/"
                    className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border border-gray-300 transition-all duration-200 font-medium"
                  >
                    소개
                  </Link>
                </li>
                <li>
                  <Link
                    href="/open"
                    className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border border-gray-300 transition-all duration-200 font-medium"
                  >
                    지표
                  </Link>
                </li>
                {user ? (
                  <>
                    <li>
                      <Link
                        href="/files"
                        className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border border-gray-300 transition-all duration-200 font-medium"
                      >
                        파일
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/account"
                        className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border border-gray-300 transition-all duration-200 font-medium"
                      >
                        계정
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        href="/login"
                        className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border border-gray-300 transition-all duration-200 font-medium"
                      >
                        로그인
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/signup"
                        className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border border-gray-300 transition-all duration-200 font-medium"
                      >
                        회원가입
                      </Link>
                    </li>
                  </>
                )}
              </ul>

              {user && (
                <div className="mt-3 p-3 bg-gray-100 border border-gray-300 rounded-lg ">
                  <p className="text-sm text-gray-700">
                    <strong>🏠 당신만의 갠홈 주소:</strong>{" "}
                    <Link
                      href={getHomepageUrl(user.loginName)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {getHomepageUrl(user.loginName)}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </nav>

          <main>{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
