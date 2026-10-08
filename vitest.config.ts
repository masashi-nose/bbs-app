import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // server-only は Next.js 内部に同梱されており node_modules に単体では存在しない。
      // 解決できないとカバレッジ計測時に session.ts が除外されるため、空モジュールに向ける
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.{css,ico}"],
      reporter: [["text", { skipFull: false }], "html", "json-summary"],
    },
  },
});
