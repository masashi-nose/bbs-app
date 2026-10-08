# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

シンプルな掲示板（BBS）アプリ。ユーザー登録・ログイン、投稿の作成・一覧・詳細・削除ができる。Next.js 16（App Router / React 19）+ TypeORM で構成。UI 文言とコードコメントは日本語。Vercel にデプロイしている。

## コマンド

```bash
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # 本番ビルド（型チェックも兼ねる）
npm run lint     # ESLint（eslint-config-next）

# TypeORM マイグレーション（-d でデータソースを明示する必要あり）
npm run migration:generate -- src/migrations/<Name> -d src/utils/data-source.ts
npm run migration:run -- -d src/utils/data-source.ts
```

```bash
npm test                              # 単体テスト（Vitest + React Testing Library）
npx vitest run src/actions/post.test.ts  # 単体テストを1ファイルだけ実行
npm run test:coverage                 # カバレッジ付き
npm run test:e2e                      # E2E（Playwright）
npx playwright test e2e/posts.spec.ts # E2E を1ファイルだけ実行
```

- `database.sqlite` は git 管理外。初回は `npm run migration:run -- -d src/utils/data-source.ts` でローカル DB を作成する。
- SQLite のパスは環境変数 `SQLITE_PATH` で上書きできる（未設定時は `database.sqlite`）。
- 単体テストは対象と同階層の `*.test.ts(x)`。async Server Component と `src/proxy.ts` は単体テスト対象外で、E2E（`e2e/*.spec.ts`）で検証する。
- E2E は `e2e/reset-db.mjs` で専用の `e2e.sqlite` を作り直し、`next build && next start -p 3100` で起動したサーバーに対して実行する（開発用 DB・ポート 3000 の dev サーバーには触れない）。実行のたびに `.next` の本番ビルド出力は上書きされる。
- `cacheComponents` により、直前のページが非表示のまま DOM に残るため、E2E では表示中の要素に絞って検索する（`e2e/helpers.ts` の `visibleText`）。

## アーキテクチャ

### データベース（`src/utils/data-source.ts`）
- 環境変数で DB を切り替える：`POSTGRES_URL` があれば Postgres（Vercel 本番、`synchronize: true`）、なければローカルの SQLite `./database.sqlite`（`synchronize: false`）。
- そのため `src/entities/` のスキーマを変更したら、ローカル SQLite 用に `src/migrations/` へマイグレーションを追加する必要がある（Postgres は自動同期）。
- リポジトリは必ず `getRepository(Entity)` / `getDataSource()` 経由で取得する（シングルトンの DataSource を遅延初期化する）。`AppDataSource` は TypeORM CLI 用に export されている。
- エンティティ同士は文字列名（`@ManyToOne('user', ...)`）と `import type` で参照し、循環 import を回避している。デコレーターのため tsconfig で `experimentalDecorators` / `emitDecoratorMetadata` を有効化しており、`tsconfig.json` の `ts-node` ブロックで CLI 実行時のみ CommonJS に切り替えている。

### 認証
- `src/utils/jwt.ts`：`jose` による HS256 JWT（シークレットは現状ハードコード）。`src/utils/session.ts`（`server-only`）が JWT を httpOnly の `session` Cookie に保存し、`verifySession()` は `{ isAuth, userId }` または `null` を返す。
- `src/proxy.ts` は Next.js 16 で `middleware.ts` に代わるもの。`/login`・`/signup` 以外の全ルートで未ログインなら `/login` へ、ログイン済みでこの2つにアクセスしたら `/` へリダイレクトする。
- パスワードは `bcryptjs` でハッシュ化。

### データフロー
- 読み書き処理はすべて `src/actions/`（`auth.ts`, `post.ts`）の Server Actions に置く。失敗時は `{ error: string }` を返し、成功時は `redirect()` する（`redirect` は意図的に `try/catch` の外に置いている）。
- クライアントページ（`login`, `signup`, `posts/create`）は `"use client"` で、`<form action>` のラッパー関数から Server Action を呼び、`result.error` をローカル state に表示する。
- `next.config.ts` で `cacheComponents` を有効化。読み取り関数（`getPosts`, `getPost`）は `"use cache"` + `cacheTag("posts")` / `cacheTag("post-<id>")` を使い、更新系では `updateTag(...)` で無効化する。読み書きを追加する際はタグの対応を揃えること。
- `cacheComponents` のため、Cookie や params を読む動的なサーバーコンポーネント（`Header`, `PostList`, `PostDetail` など）は `<Suspense>` 内でレンダリングする必要がある（`layout.tsx`, `page.tsx` 参照）。
- キャッシュされる戻り値は TypeORM のエンティティインスタンスをシリアライズ可能にするため、プレーンオブジェクト（`{ ...post, user: { ...post.user } }`）に変換して返す。

### スタイリング
Tailwind CSS v4（`postcss.config.mjs` + `src/app/globals.css` の `@import "tailwindcss"`）に統一している。
- スタイルは Tailwind のユーティリティクラスのみで書く。`style` 属性の直書きは ESLint（`react/forbid-dom-props`）でエラーになる。グローバルな CSS クラスは追加しない。
- 色・フォントは `globals.css` の `@theme` にトークンとして定義し、`bg-primary` / `text-muted` / `border-border` のように参照する（16進カラーの直書きはしない）。
- 2箇所以上で使う見た目は `src/components/ui/`（`Button`, `Card`, `Spinner`, `TextField` / `TextAreaField` / `FieldError`）に寄せる。アプリ共通の部品（`Header`, `HeaderFrame`, `Loader`, `SubmitButton`）は `src/components/`。条件付きクラスは `src/utils/cn.ts` で結合する。
- テストではクラス名に依存せず、role / ラベル / `data-*` 属性（例: パスワード条件の `data-met`、`data-testid="spinner"`）で要素を特定する。
