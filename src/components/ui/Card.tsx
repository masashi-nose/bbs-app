import { cn } from "@/utils/cn";

export default function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg bg-surface p-5 shadow-sm", className)} {...props} />
  );
}
