import Link from "next/link";

// ヘッダーの外枠。Header 本体と、layout.tsx の読み込み中表示（Suspense fallback）で共用する
export default function HeaderFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bg-header py-4 text-white">
      <div className="mx-auto flex max-w-[800px] items-center justify-between px-5">
        <h1>
          <Link href="/" className="text-2xl font-bold">
            BBS App
          </Link>
        </h1>
        {children}
      </div>
    </header>
  );
}
