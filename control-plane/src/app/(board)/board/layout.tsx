import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";

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
  return (
    <html lang="ko">
      <body className={korean.className}>
        <main>{children}</main>
      </body>
    </html>
  );
}
