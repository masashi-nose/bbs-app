"use client";

import { useFormStatus } from "react-dom";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";

// 送信中は二重送信を防ぐためにボタンを無効化し、ローディングマークを表示する
export default function SubmitButton({
  label,
  pendingLabel,
  fullWidth = false,
}: {
  label: string;
  pendingLabel: string;
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth={fullWidth} disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          {/* 見た目はスピナーのみ。読み上げ用に処理中のラベルを残す */}
          <span className="sr-only">{pendingLabel}</span>
        </>
      ) : (
        label
      )}
    </Button>
  );
}
