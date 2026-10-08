import { getPost } from "@/actions/post";
import DeletePostButton from "./DeletePostButton";
import { notFound } from "next/navigation";
import { verifySession } from "@/utils/session";

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
      <div className="card">
        <h1 style={{ marginBottom: "15px", fontSize: "24px" }}>{post.title}</h1>
        <p
          style={{
            color: "#666",
            fontSize: "14px",
            marginBottom: "20px",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
          }}
        >
          投稿者: {post.user.userName} | 作成日:{" "}
          {new Date(post.createdAt).toLocaleString()}
        </p>
        <div style={{ lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
          {post.content}
        </div>
      </div>

      {isOwner && (
        <div style={{ marginTop: "20px" }}>
          <DeletePostButton postId={post.id} />
        </div>
      )}
    </>
  );
}
