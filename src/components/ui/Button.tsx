import { cn } from "@/utils/cn";

const variants = {
  primary: "rounded-md bg-primary px-5 py-2.5 text-white hover:bg-primary-hover",
  danger: "rounded-md bg-danger px-5 py-2.5 text-white hover:bg-danger-hover",
  // ヘッダーなど背景色のある場所に置く文字だけのボタン
  ghost: "bg-transparent font-bold text-inherit",
};

type Props = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  fullWidth?: boolean;
};

export default function Button({
  variant = "primary",
  fullWidth = false,
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center text-base transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
