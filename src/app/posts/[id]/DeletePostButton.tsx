"use client";

import { deletePost } from "@/actions/post";
import Button from "@/components/ui/Button";

export default function DeletePostButton({ postId }: { postId: number }) {
  const handleDelete = async () => {
    if (window.confirm("本当に削除しますか？")) {
      await deletePost(postId);
    }
  };

  return (
    <Button variant="danger" onClick={handleDelete}>
      削除
    </Button>
  );
}
