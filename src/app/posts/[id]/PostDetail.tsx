import { getPost } from "@/actions/post";
import DeletePostButton from "./DeletePostButton";
import { notFound } from "next/navigation";
import { verifySession } from "@/utils/session";
import Card from "@/components/ui/Card";

export default async function PostDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = parseInt(id);
  const post = await getPost(postId);

  if (!post) notFound();

  const session = await verifySession();
  const isOwner =
    session && session.userId && parseInt(session.userId) === post.userId; // 投稿者の場合 (削除ボタン表示)

  return (
    <>
      <Card>
        <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>
        <p className="mb-5 border-b border-divider pb-2.5 text-sm text-muted">
          投稿者: {post.user.userName} | 作成日:{" "}
          {new Date(post.createdAt).toLocaleString()}
        </p>
        <div className="leading-[1.8] whitespace-pre-wrap">{post.content}</div>
      </Card>

      {isOwner && (
        <div className="mt-5">
          <DeletePostButton postId={post.id} />
        </div>
      )}
    </>
  );
}
