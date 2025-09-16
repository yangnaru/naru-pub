import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { validateRequest } from "@/lib/auth";
import Image from "next/image";
import { Toaster } from "@/components/ui/toaster";
import { getHomepageUrl } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/ModeToggle";

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
    <html lang="ko" suppressHydrationWarning>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
      <body className={korean.className}>
        <div className="bg-gray-50 min-h-screen">
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="flex items-center gap-3 group">
                    <h1 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      나루
                    </h1>
                    <Image
                      src="/logo.png"
                      alt="logo"
                      width={28}
                      height={28}
                      className="group-hover:scale-110 transition-transform duration-200"
                    />
                  </Link>
                </div>

                <div className="flex items-center space-x-1">
                  <Link
                    href="/"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    소개
                  </Link>
                  <Link
                    href="/open"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    지표
                  </Link>
                  {user ? (
                    <>
                      <Link
                        href="/files"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        파일
                      </Link>
                      <Link
                        href="/account"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        계정
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        로그인
                      </Link>
                      <Link
                        href="/signup"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        회원가입
                      </Link>
                    </>
                  )}
                  <ModeToggle />
                </div>
              </div>
            </div>

            {user && (
              <div className="border-t border-gray-200 bg-blue-50/50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-blue-600">🏠</span>
                      <span className="font-medium">당신만의 갠홈 주소:</span>
                      <Link
                        href={getHomepageUrl(user.loginName)}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors duration-200"
                      >
                        {getHomepageUrl(user.loginName)}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </nav>

          <main>{children}</main>
        </div>
        <Toaster />
      </body>
      </ThemeProvider>
    </html>
  );
}
