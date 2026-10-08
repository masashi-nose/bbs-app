import { expect, type Page } from "@playwright/test";

export type TestUser = {
  userName: string;
  email: string;
  password: string;
};

let counter = 0;

/** テストごとにユニークなユーザー情報を生成する（メールアドレスの重複を避ける） */
export function uniqueUser(prefix = "user"): TestUser {
  counter += 1;
  const id = `${Date.now()}-${process.pid}-${counter}`;
  return {
    userName: `${prefix}-${id}`,
    email: `${prefix}-${id}@example.com`,
    password: "password123",
  };
}

/** テストごとにユニークな文字列を生成する（投稿タイトルなど） */
export function uniqueText(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** 新規登録フォームを送信する（遷移先の検証は呼び出し側で行う） */
export async function submitSignup(page: Page, user: TestUser) {
  await page.goto("/signup");
  await page.getByLabel("ユーザー名").fill(user.userName);
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "登録する" }).click();
}

/** 新規登録して自動ログインされ、一覧に遷移するまで待つ */
export async function signup(page: Page, user: TestUser = uniqueUser()) {
  await submitSignup(page, user);
  await expect(page).toHaveURL("/");
  await expect(header(page).getByRole("button", { name: "ログアウト" })).toBeVisible();
  return user;
}

/** ログインフォームを送信する（遷移先の検証は呼び出し側で行う） */
export async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

/**
 * ヘッダーのログアウトボタンからログアウトし、ログインフォームが表示されるまで待つ。
 * 注意: 現状の実装では、ログアウト後にログインフォームは表示されるが URL は "/" のまま
 * （logout の redirect("/") の遷移先を proxy が /login に振り替えるが、アドレスバーは更新されない）。
 * そのため URL ではなく画面表示で待つ。挙動自体は auth.spec.ts で記録している。
 */
export async function logout(page: Page) {
  await header(page).getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  await expect(header(page).getByRole("button", { name: "ログアウト" })).toHaveCount(0);
}

/** 投稿を作成して一覧に戻るまで待ち、作成した投稿の ID を返す */
export async function createPost(page: Page, title: string, content: string) {
  await page.goto("/posts/create");
  await page.getByLabel("タイトル").fill(title);
  await page.getByLabel("本文").fill(content);
  await page.locator("main").getByRole("button", { name: "投稿する" }).click();
  await expect(page).toHaveURL("/");

  const link = page.getByRole("link", { name: title, exact: true });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const match = href?.match(/^\/posts\/(\d+)$/);
  if (!match) throw new Error(`投稿詳細へのリンクが不正です: ${href}`);
  return Number(match[1]);
}

export function header(page: Page) {
  return page.locator("header");
}

/**
 * cacheComponents 有効時は、直前に表示していたページが React の Activity で
 * 非表示のまま DOM に残るため、テキストで探すときは表示中の要素に絞り込む
 */
export function visibleText(page: Page, text: string) {
  return page.getByText(text).filter({ visible: true });
}

/** 一覧の投稿カード（タイトル見出し）の一覧 */
export function postTitles(page: Page) {
  return page.locator(".post-list .post-title").filter({ visible: true });
}
