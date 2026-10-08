import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// globals: false のため RTL の自動クリーンアップが働かない。テストごとに DOM を破棄する
afterEach(() => {
  cleanup();
});
