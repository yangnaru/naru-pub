import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "나루",
  description: "인터넷 나루터",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="container mx-auto p-10">
          <nav className="pb-10">
            <Link href="/" className="flex flex-row gap-2 items-baseline">
              <h1 className="text-4xl">나루</h1>
              <span>인터넷 나루터</span>
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
