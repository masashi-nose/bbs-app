import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import HeaderFrame from "@/components/HeaderFrame";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Suspense fallback={<HeaderFrame />}>
          <Header />
        </Suspense>
        <main className="mx-auto max-w-[800px] px-5 py-10">{children}</main>
      </body>
    </html>
  );
}
