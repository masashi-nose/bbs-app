import { cn } from "@/utils/cn";

const sizes = {
  // ボタン内（白背景の上に乗らないため白系）
  sm: "size-[18px] border-2 border-white/40 border-t-white",
  lg: "size-10 border-4 border-divider border-t-primary",
};

// 装飾目的のため読み上げ対象外。状態は呼び出し側で sr-only のテキストなどにより伝える
export default function Spinner({ size = "sm" }: { size?: keyof typeof sizes }) {
  return (
    <span
      data-testid="spinner"
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full motion-reduce:[animation-duration:2.4s]",
        sizes[size],
      )}
    />
  );
}
