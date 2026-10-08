// 条件付きのクラス名を結合する（falsy な値は除外）
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
