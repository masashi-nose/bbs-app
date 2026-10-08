"use client";

import { useFormStatus } from "react-dom";

// 送信中は二重送信を防ぐためにボタンを無効化し、ローディングマークを表示する
export default function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn"
      style={{ width: "100%", marginBottom: "15px" }}
      disabled={pending}
    >
      {pending ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          {/* 見た目はスピナーのみ。読み上げ用に処理中のラベルを残す */}
          <span className="visually-hidden">{pendingLabel}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
