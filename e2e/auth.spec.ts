import { test, expect } from "@playwright/test";
import {
  header,
  logout,
  signup,
  submitLogin,
  submitSignup,
  uniqueUser,
} from "./helpers";

test.describe("新規登録", () => {
  test("登録すると自動でログインされ、一覧画面に遷移して session Cookie が発行される", async ({
    page,
    context,
  }) => {
    const user = uniqueUser();
    await submitSignup(page, user);

    await expect(page).toHaveURL("/");
    await expect(header(page).getByRole("link", { name: "投稿する" })).toBeVisible();
    await expect(header(page).getByRole("button", { name: "ログアウト" })).toBeVisible();

    const session = (await context.cookies()).find((c) => c.name === "session");
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.secure).toBe(true);
    expect(session?.sameSite).toBe("Lax");
  });

  test("登録済みのメールアドレスで登録するとエラーが表示され、登録画面に留まる", async ({
    page,
    context,
  }) => {
    const user = await signup(page);
    await logout(page);

    await submitSignup(page, { ...user, userName: `${user.userName}-2` });

    await expect(page.getByText("このメールアドレスは既に使用されています")).toBeVisible();
    await expect(page).toHaveURL("/signup");
    expect((await context.cookies()).find((c) => c.name === "session")).toBeUndefined();
  });

  test("必須項目が空のときはブラウザのバリデーションで送信されない", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("ユーザー名").fill("no-email");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page).toHaveURL("/signup");
    const valid = await page
      .getByLabel("メールアドレス")
      .evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
  });
});

test.describe("ログイン", () => {
  test("登録済みユーザーは正しいパスワードでログインでき、一覧画面に遷移する", async ({
    page,
  }) => {
    const user = await signup(page);
    await logout(page);

    await submitLogin(page, user.email, user.password);

    await expect(page).toHaveURL("/");
    await expect(header(page).getByRole("button", { name: "ログアウト" })).toBeVisible();
  });

  test("誤ったパスワードではエラーが表示され、ログイン画面に留まる", async ({
    page,
    context,
  }) => {
    const user = await signup(page);
    await logout(page);

    await submitLogin(page, user.email, "wrong-password");

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません")
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
    expect((await context.cookies()).find((c) => c.name === "session")).toBeUndefined();
  });

  test("未登録のメールアドレスでは誤ったパスワードと同じエラーが表示される", async ({ page }) => {
    const user = uniqueUser("unregistered");

    await submitLogin(page, user.email, user.password);

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません")
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Header", () => {
  test("未ログイン時は「投稿する」リンクと「ログアウト」ボタンが表示されない", async ({ page }) => {
    await page.goto("/login");

    await expect(header(page).getByRole("link", { name: "BBS App" })).toBeVisible();
    await expect(header(page).getByRole("link", { name: "投稿する" })).toHaveCount(0);
    await expect(header(page).getByRole("button", { name: "ログアウト" })).toHaveCount(0);
  });

  test("ログイン時は「投稿する」リンクと「ログアウト」ボタンが表示され、リンクから投稿作成画面に遷移できる", async ({
    page,
  }) => {
    await signup(page);

    await header(page).getByRole("link", { name: "投稿する" }).click();

    await expect(page).toHaveURL("/posts/create");
    await expect(page.getByRole("heading", { name: "新規投稿" })).toBeVisible();
  });

  test("ログアウトすると Cookie が削除され、ログイン画面に遷移して保護ページにアクセスできなくなる", async ({
    page,
    context,
  }) => {
    await signup(page);

    await logout(page);

    expect((await context.cookies()).find((c) => c.name === "session")).toBeUndefined();
    await expect(header(page).getByRole("button", { name: "ログアウト" })).toHaveCount(0);
    await expect(header(page).getByRole("link", { name: "投稿する" })).toHaveCount(0);

    await page.goto("/posts/create");
    await expect(page).toHaveURL("/login");
  });

  test("[現状の挙動を記録] ログアウト直後はログインフォームが表示されるが URL は / のままで、再読み込みで /login になる", async ({
    page,
  }) => {
    test.info().annotations.push({
      type: "known-issue",
      description:
        "logout() の redirect(\"/\") の遷移先を proxy が /login に振り替えるが、アドレスバーの URL は / のまま更新されない",
    });
    await signup(page);

    await logout(page);

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  });
});
