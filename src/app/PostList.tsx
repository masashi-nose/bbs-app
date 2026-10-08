import { getPosts } from "@/actions/post";
import Card from "@/components/ui/Card";
import Link from "next/link";

export default async function PostList() {
  const posts = await getPosts();

  if (posts.length === 0) {
    return (
      <Card>
        <p>投稿がありません</p>
      </Card>
    );
  }

  return (
    <ul aria-label="記事一覧" className="flex flex-col gap-5">
      {posts.map((post) => (
        <li key={post.id}>
          <Card>
            <h3 className="mb-2.5 text-2xl font-bold">
              <Link href={`/posts/${post.id}`} className="text-primary hover:underline">
                {post.title}
              </Link>
            </h3>
            <p className="mb-1 text-sm text-muted">
              投稿者: {post.user.userName} | 作成日:{" "}
              {new Date(post.createdAt).toLocaleString()}
            </p>
            <p className="line-clamp-2">{post.content}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
