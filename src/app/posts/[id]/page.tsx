import Link from "next/link";
import PostDetail from "./PostDetail";
import { Suspense } from "react";
import Loader from "@/components/Loader";

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="mt-8">
      <Link href="/" className="mb-5 inline-block text-primary hover:underline">
        &larr; 一覧に戻る
      </Link>

      <Suspense fallback={<Loader />}>
        <PostDetail params={params} />
      </Suspense>
    </div>
  );
}
