// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT:${url}`);
    }
  }
  return {
    RedirectError,
    redirect: vi.fn((url: string) => {
      throw new RedirectError(url);
    }),
    repository: {
      findOneBy: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
    },
    getRepository: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    verifySession: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/utils/data-source", () => ({ getRepository: mocks.getRepository }));
vi.mock("@/utils/session", () => ({
  createSession: mocks.createSession,
  deleteSession: mocks.deleteSession,
  verifySession: mocks.verifySession,
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash, compare: mocks.compare },
}));

import { login, logout, signup } from "./auth";
import { User } from "@/entities/User";

const { repository, RedirectError } = mocks;

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getRepository.mockResolvedValue(repository);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("signup（ユーザー登録）", () => {
  const validInput = {
    username: "taro",
    email: "taro@example.com",
    password: "password123",
  };

  it.each([
    ["ユーザー名", { ...validInput, username: "" }],
    ["メールアドレス", { ...validInput, email: "" }],
    ["パスワード", { ...validInput, password: "" }],
  ])("%sが空の場合はエラーを返し、DB にアクセスしない", async (_label, input) => {
    const result = await signup(buildFormData(input));

    expect(result).toEqual({ error: "すべてのフィールドを入力してください。" });
    expect(mocks.getRepository).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("フィールド自体が送信されていない場合もエラーを返す", async () => {
    const result = await signup(new FormData());

    expect(result).toEqual({ error: "すべてのフィールドを入力してください。" });
    expect(mocks.getRepository).not.toHaveBeenCalled();
  });

  it("メールアドレスが既に使われている場合はエラーを返し、ユーザーを保存しない", async () => {
    repository.findOneBy.mockResolvedValue({ id: 1, email: validInput.email });

    const result = await signup(buildFormData(validInput));

    expect(result).toEqual({ error: "このメールアドレスは既に使用されています" });
    expect(repository.findOneBy).toHaveBeenCalledWith({ email: validInput.email });
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("正常に登録できた場合はハッシュ化したパスワードで保存し、セッションを作成してトップへリダイレクトする", async () => {
    repository.findOneBy.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    const created = { userName: "taro", email: validInput.email, password: "hashed-password" };
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue({ ...created, id: 42 });

    await expect(signup(buildFormData(validInput))).rejects.toBeInstanceOf(RedirectError);

    expect(mocks.getRepository).toHaveBeenCalledWith(User);
    expect(mocks.hash).toHaveBeenCalledWith("password123", 10);
    expect(repository.create).toHaveBeenCalledWith({
      userName: "taro",
      email: "taro@example.com",
      password: "hashed-password",
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(mocks.createSession).toHaveBeenCalledWith("42");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("平文のパスワードを保存しない", async () => {
    repository.findOneBy.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    repository.create.mockImplementation((data) => data);
    repository.save.mockResolvedValue({ id: 1 });

    await expect(signup(buildFormData(validInput))).rejects.toBeInstanceOf(RedirectError);

    const saved = repository.create.mock.calls[0][0];
    expect(saved.password).not.toBe(validInput.password);
  });

  it("保存中に例外が発生した場合はエラーを返し、セッションを作成せずリダイレクトもしない", async () => {
    repository.findOneBy.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    repository.create.mockReturnValue({});
    repository.save.mockRejectedValue(new Error("DB error"));

    const result = await signup(buildFormData(validInput));

    expect(result).toEqual({ error: "ユーザー登録中にエラーが発生しました" });
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("DB 接続に失敗した場合はエラーを返す", async () => {
    mocks.getRepository.mockRejectedValue(new Error("connection failed"));

    const result = await signup(buildFormData(validInput));

    expect(result).toEqual({ error: "ユーザー登録中にエラーが発生しました" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("セッション作成に失敗した場合はエラーを返しリダイレクトしない", async () => {
    repository.findOneBy.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    repository.create.mockReturnValue({});
    repository.save.mockResolvedValue({ id: 1 });
    mocks.createSession.mockRejectedValue(new Error("cookie error"));

    const result = await signup(buildFormData(validInput));

    expect(result).toEqual({ error: "ユーザー登録中にエラーが発生しました" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("login（ログイン）", () => {
  const validInput = { email: "taro@example.com", password: "password123" };
  const storedUser = { id: 7, email: validInput.email, password: "hashed-password" };

  it("該当ユーザーが存在しない場合は汎用エラーを返す", async () => {
    repository.findOneBy.mockResolvedValue(null);

    const result = await login(buildFormData(validInput));

    expect(result).toEqual({ error: "メールアドレスまたはパスワードが正しくありません" });
    expect(repository.findOneBy).toHaveBeenCalledWith({ email: validInput.email });
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("パスワードが一致しない場合はユーザー不在時と同じエラーを返す", async () => {
    repository.findOneBy.mockResolvedValue(storedUser);
    mocks.compare.mockResolvedValue(false);

    const result = await login(buildFormData({ ...validInput, password: "wrong" }));

    expect(result).toEqual({ error: "メールアドレスまたはパスワードが正しくありません" });
    expect(mocks.compare).toHaveBeenCalledWith("wrong", "hashed-password");
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("認証に成功した場合はユーザー ID でセッションを作成しトップへリダイレクトする", async () => {
    repository.findOneBy.mockResolvedValue(storedUser);
    mocks.compare.mockResolvedValue(true);

    await expect(login(buildFormData(validInput))).rejects.toBeInstanceOf(RedirectError);

    expect(mocks.getRepository).toHaveBeenCalledWith(User);
    expect(mocks.compare).toHaveBeenCalledWith("password123", "hashed-password");
    expect(mocks.createSession).toHaveBeenCalledWith("7");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("DB で例外が発生した場合はエラーを返す", async () => {
    repository.findOneBy.mockRejectedValue(new Error("DB error"));

    const result = await login(buildFormData(validInput));

    expect(result).toEqual({ error: "ログイン中にエラーが発生しました" });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("セッション作成に失敗した場合はエラーを返しリダイレクトしない", async () => {
    repository.findOneBy.mockResolvedValue(storedUser);
    mocks.compare.mockResolvedValue(true);
    mocks.createSession.mockRejectedValue(new Error("cookie error"));

    const result = await login(buildFormData(validInput));

    expect(result).toEqual({ error: "ログイン中にエラーが発生しました" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("logout（ログアウト）", () => {
  it("セッションを削除してトップへリダイレクトする", async () => {
    await expect(logout()).rejects.toBeInstanceOf(RedirectError);

    expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});
