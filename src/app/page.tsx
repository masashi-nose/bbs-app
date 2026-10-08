import { Suspense } from "react";
import PostList from "./PostList";
import Loader from "@/components/Loader";

export default function Home() {
  return (
    <div>
      <h2 className="mb-5 text-2xl font-bold">記事一覧</h2>
      <Suspense fallback={<Loader />}>
        <PostList />
      </Suspense>
    </div>
  );
}
