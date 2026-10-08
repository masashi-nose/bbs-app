import { test, expect, type Page } from "@playwright/test";
import {
  createPost,
  logout,
  postTitles,
  signup,
  uniqueText,
  visibleText,
} from "./helpers";

/**
 * SQLite の createdAt は DEFAULT (datetime('now')) で秒精度のため、
 * 同一秒内に作成された投稿同士の並び順は保証されない。
 * 並び順を検証する前に、直前の投稿と作成時刻が確実に異なるよう 1 秒以上待つ。
 */
async function waitForNextSecond(page: Page) {
  await page.waitForTimeout(1100);
}

test.describe("投稿の一連のフロー", () => {
  test("登録 → 投稿 → 一覧の先頭に表示 → 詳細 → 削除 → 一覧と詳細から消える", async ({
    page,
  }) => {
    const user = await signup(page);
    const title = uniqueText("フロー投稿");
    const content = "フローテストの本文です。\n2 行目";

    await waitForNextSecond(page);
    const postId = await createPost(page, title, content);

    // 一覧の先頭に表示される（updateTag("posts") によりキャッシュが更新されている）
    await expect(postTitles(page).first()).toHaveText(title);
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: title }) })
      .filter({ visible: true });
    await expect(card).toContainText(`投稿者: ${user.userName}`);
    await expect(card).toContainText("フローテストの本文です。");

    // 詳細画面
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(`/posts/${postId}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(visibleText(page, `投稿者: ${user.userName}`)).toBeVisible();
    await expect(visibleText(page, "2 行目")).toBeVisible();

    // 削除（確認ダイアログで OK）
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toBe("本当に削除しますか？");
      await dialog.accept();
    });
    await page.getByRole("button", { name: "削除" }).click();

    // 一覧に戻り、削除した投稿が表示されない（updateTag("posts") が効いている）
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "記事一覧" })).toBeVisible();
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);

    // 再読み込みしても表示されない（サーバー側のキャッシュも無効化されている）
    await page.reload();
    await expect(page.getByRole("heading", { name: "記事一覧" })).toBeVisible();
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);

    // 詳細画面も not found になる（updateTag(`post-<id>`) が効いている）
    await page.goto(`/posts/${postId}`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  test("削除の確認ダイアログでキャンセルすると投稿は削除されない", async ({ page }) => {
    await signup(page);
    const title = uniqueText("キャンセル投稿");
    const postId = await createPost(page, title, "本文");

    await page.goto(`/posts/${postId}`);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "削除" }).click();

    await expect(page).toHaveURL(`/posts/${postId}`);
    await page.goto("/");
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  });
});

test.describe("投稿作成", () => {
  test("タイトルが空のまま投稿するとエラーが表示され、投稿されない", async ({ page }) => {
    await signup(page);
    const content = uniqueText("タイトルなし本文");

    await page.goto("/posts/create");
    await page.getByLabel("本文").fill(content);
    await page.locator("main").getByRole("button", { name: "投稿する" }).click();

    await expect(page.getByText("タイトルと本文を入力してください")).toBeVisible();
    await expect(page).toHaveURL("/posts/create");

    await page.goto("/");
    await expect(page.getByText(content)).toHaveCount(0);
  });

  test("本文が空のまま投稿するとエラーが表示される", async ({ page }) => {
    await signup(page);

    await page.goto("/posts/create");
    await page.getByLabel("タイトル").fill(uniqueText("本文なし"));
    await page.locator("main").getByRole("button", { name: "投稿する" }).click();

    await expect(page.getByText("タイトルと本文を入力してください")).toBeVisible();
    await expect(page).toHaveURL("/posts/create");
  });
});

test.describe("PostList", () => {
  test("投稿は作成日時の新しい順に表示される", async ({ page }) => {
    await signup(page);
    const older = uniqueText("古い投稿");
    const newer = uniqueText("新しい投稿");

    await waitForNextSecond(page);
    await createPost(page, older, "先に作成した投稿");
    await waitForNextSecond(page);
    await createPost(page, newer, "後に作成した投稿");

    const titles = await postTitles(page).allTextContents();
    expect(titles[0]).toBe(newer);
    expect(titles[1]).toBe(older);
  });
});

test.describe("PostDetail", () => {
  test("存在しない ID の投稿にアクセスすると not found が表示される", async ({ page }) => {
    await signup(page);

    await page.goto("/posts/99999999");

    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);
  });

  test("[既知のバグ・現状の挙動を記録] 数値でない ID にアクセスすると not found ではなくサーバーエラー画面になる", async ({
    page,
  }) => {
    test.info().annotations.push({
      type: "known-issue",
      description:
        "PostDetail が parseInt(\"abc\") = NaN をそのまま getPost に渡し、SQLITE_ERROR: no such column: NaN で例外になる。本来は notFound() にすべき",
    });
    await signup(page);

    await page.goto("/posts/abc");

    await expect(page.getByText("Application error: a server-side exception has occurred")).toBeVisible();
    await expect(page.getByText("This page could not be found.")).toHaveCount(0);
  });

  test("自分の投稿には削除ボタンが表示され、他人の投稿には表示されない", async ({ page }) => {
    // ユーザー A が投稿
    const userA = await signup(page);
    const titleA = uniqueText("A の投稿");
    const postIdA = await createPost(page, titleA, "A の本文");

    await page.goto(`/posts/${postIdA}`);
    await expect(page.getByRole("button", { name: "削除" })).toBeVisible();
    await logout(page);

    // ユーザー B でログインして A の投稿を見る
    await signup(page);
    await page.goto(`/posts/${postIdA}`);
    await expect(page.getByRole("heading", { level: 1, name: titleA })).toBeVisible();
    await expect(visibleText(page, `投稿者: ${userA.userName}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);

    // B 自身の投稿には削除ボタンが表示される
    const titleB = uniqueText("B の投稿");
    const postIdB = await createPost(page, titleB, "B の本文");
    await page.goto(`/posts/${postIdB}`);
    await expect(page.getByRole("button", { name: "削除" })).toBeVisible();
  });

  test("[既知のバグ・現状の挙動を記録] 削除に失敗しても DeletePostButton はエラーを表示しない", async ({
    page,
    context,
  }) => {
    test.info().annotations.push({
      type: "known-issue",
      description:
        "DeletePostButton は deletePost の戻り値 { error } を無視するため、削除失敗時に画面に何も表示されない",
    });

    await signup(page);
    const title = uniqueText("二重削除");
    const postId = await createPost(page, title, "本文");
    await page.goto(`/posts/${postId}`);
    await expect(page.getByRole("button", { name: "削除" })).toBeVisible();

    // 別タブで先に削除しておく
    const other = await context.newPage();
    await other.goto(`/posts/${postId}`);
    other.once("dialog", (dialog) => dialog.accept());
    await other.getByRole("button", { name: "削除" }).click();
    await expect(other).toHaveURL("/");
    await other.close();

    // 元のタブで削除すると、サーバーは { error: "投稿が見つかりません" } を返すが画面には表示されない
    const actionResponse = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes(`/posts/${postId}`)
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "削除" }).click();
    // Server Action の応答（{ error: "投稿が見つかりません" }）が返るまで待つ。
    // 応答本文はストリーミングされ取得タイミングで内容が欠けるため、本文自体は検証しない
    const response = await actionResponse;
    expect(response.status()).toBe(200);

    await expect(page).toHaveURL(`/posts/${postId}`);
    await expect(page.getByText("投稿が見つかりません")).toHaveCount(0);
    // 既に削除された投稿の詳細と削除ボタンが表示されたまま、何も起きない
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("button", { name: "削除" })).toBeVisible();
  });
});
