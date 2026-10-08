"use client";

import { createPost } from "@/actions/post";
import SubmitButton from "@/components/SubmitButton";
import Card from "@/components/ui/Card";
import { FieldError, TextAreaField, TextField } from "@/components/ui/TextField";
import { useState } from "react";

export default function CreatePostPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const result = await createPost(formData);
    if (result && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-[600px]">
      <Card>
        <h2 className="mb-5 text-2xl font-bold">新規投稿</h2>
        <form action={handleSubmit}>
          <TextField id="title" label="タイトル" type="text" placeholder="タイトルを入力" />
          <TextAreaField id="content" label="本文" placeholder="本文を入力" />
          {error && <FieldError className="mb-4">{error}</FieldError>}
          <SubmitButton label="投稿する" pendingLabel="投稿中…" />
        </form>
      </Card>
    </div>
  );
}
