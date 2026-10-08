// E2E 専用の SQLite DB を作り直してマイグレーションを流すスクリプト。
// Playwright は webServer を globalSetup より先に起動し、かつ `next build` 時に
// "use cache" の getPosts が DB を読むため、globalSetup ではなく webServer コマンドの先頭で実行する。
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const dbFile = process.env.SQLITE_PATH;

// 開発用 DB（database.sqlite）を誤って消さないためのガード
if (!dbFile || path.basename(dbFile) === "database.sqlite") {
  console.error(
    `[e2e] SQLITE_PATH に E2E 専用の DB ファイルを指定してください（現在: ${dbFile ?? "未設定"}）`
  );
  process.exit(1);
}

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(path.join(process.cwd(), dbFile + suffix), { force: true });
}

execSync("npm run migration:run -- -d src/utils/data-source.ts", {
  stdio: "inherit",
  // POSTGRES_URL が設定されていると Postgres に向くため明示的に空にする
  env: { ...process.env, SQLITE_PATH: dbFile, POSTGRES_URL: "" },
});

console.log(`[e2e] ${dbFile} を初期化しました`);
