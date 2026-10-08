import { defineConfig, devices } from "@playwright/test";

// 開発サーバー（ポート 3000 / database.sqlite）と分離するため、別ポート・別 DB で起動する
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const E2E_DB = "e2e.sqlite";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // 投稿一覧は全ユーザー共通の状態を持つため、件数や並び順を検証するテストが干渉しないよう直列で実行する
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // 0 件表示は DB が空であることが前提のため、他のテストより先に実行する
    {
      name: "empty-db",
      testMatch: "empty-state.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: "empty-state.spec.ts",
      dependencies: ["empty-db"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // next dev は同一ディレクトリで二重起動できない（.next/dev/lock）ため、build + start を使う。
    // next build は .next/dev を削除しないので、開発中の next dev とも共存できる。
    // DB 初期化 → ビルド（ビルド時にも "use cache" の getPosts が DB を読む）→ 起動 の順に実行する。
    command: `node e2e/reset-db.mjs && npx next build && npx next start -p ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      SQLITE_PATH: E2E_DB,
      // 設定されていると Postgres に接続してしまうため明示的に空にする
      POSTGRES_URL: "",
    },
  },
});
