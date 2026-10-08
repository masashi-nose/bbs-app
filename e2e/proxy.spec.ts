import { test, expect } from "@playwright/test";
import { signup } from "./helpers";

test.describe("proxy: 未ログイン時のリダイレクト", () => {
  for (const path of ["/", "/posts/create", "/posts/1"]) {
    test(`未ログインで ${path} にアクセスすると /login にリダイレクトされる`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL("/login");
      await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    });
  }

  test("未ログインでも /login と /signup にはアクセスできる", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();

    await page.goto("/signup");
    await expect(page).toHaveURL("/signup");
    await expect(page.getByRole("heading", { name: "アカウント登録" })).toBeVisible();
  });

  test("改ざんされた session Cookie では未ログイン扱いになり /login にリダイレクトされる", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "session", value: "invalid.jwt.token", url: baseURL! },
    ]);

    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("proxy: ログイン済み時のリダイレクト", () => {
  for (const path of ["/login", "/signup"]) {
    test(`ログイン済みで ${path} にアクセスすると / にリダイレクトされる`, async ({ page }) => {
      await signup(page);

      await page.goto(path);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "記事一覧" })).toBeVisible();
    });
  }
});
