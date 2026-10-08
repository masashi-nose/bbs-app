import { test, expect } from "@playwright/test";
import { signup } from "./helpers";

// playwright.config.ts の project "empty-db" として、他のテストより先に（DB が空の状態で）実行される
test.describe("PostList（投稿 0 件）", () => {
  test("投稿が 1 件もないとき「投稿がありません」と表示される", async ({ page }) => {
    await signup(page);

    await expect(page.getByRole("heading", { name: "記事一覧" })).toBeVisible();
    await expect(page.getByText("投稿がありません")).toBeVisible();
    await expect(page.locator(".post-list")).toHaveCount(0);
  });
});
