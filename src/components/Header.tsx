import { logout } from "@/actions/auth";
import { verifySession } from "@/utils/session";
import Link from "next/link";
import HeaderFrame from "./HeaderFrame";
import Button from "./ui/Button";

export default async function Header() {
  const session = await verifySession();

  return (
    <HeaderFrame>
      {session && session.userId && (
        <nav className="flex items-center gap-5">
          <Link href="/posts/create" className="font-bold">
            投稿する
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost">
              ログアウト
            </Button>
          </form>
        </nav>
      )}
    </HeaderFrame>
  );
}
