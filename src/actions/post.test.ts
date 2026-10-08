// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT:${url}`);
    }
  }
  const createRepository = () => ({
    findOneBy: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  });
  return {
    RedirectError,
    redirect: vi.fn((url: string) => {
      throw new RedirectError(url);
    }),
    postRepository: createRepository(),
    userRepository: createRepository(),
    getRepository: vi.fn(),
    verifySession: vi.fn(),
    cacheTag: vi.fn(),
    updateTag: vi.fn(),
    revalidateTag: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({
  cacheTag: mocks.cacheTag,
  updateTag: mocks.updateTag,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/utils/data-source", () => ({
  getRepository: mocks.getRepository,
  AppDataSource: {},
}));
vi.mock("@/utils/session", () => ({ verifySession: mocks.verifySession }));

import { createPost, deletePost, getPost, getPosts } from "./post";
import { Post } from "@/entities/Post";
import { User } from "@/entities/User";

const { postRepository, userRepository, RedirectError } = mocks;

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

const loggedIn = { isAuth: true, userId: "1" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getRepository.mockImplementation(async (entity: unknown) => {
    if (entity === Post) return postRepository;
    if (entity === User) return userRepository;
    throw new Error("unexpected entity");
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createPost（投稿作成）", () => {
  const validInput = { title: "はじめての投稿", content: "本文です" };

  it.each([
    ["タイトル", { ...validInput, title: "" }],
    ["本文", { ...validInput, content: "" }],
  ])("%sが空の場合はエラーを返し、認証確認や DB アクセスをしない", async (_label, input) => {
    const result = await createPost(buildFormData(input));

    expect(result).toEqual({ error: "タイトルと本文を入力してください" });
    expect(mocks.verifySession).not.toHaveBeenCalled();
    expect(mocks.getRepository).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("未ログインの場合はエラーを返し、投稿を保存しない", async () => {
    mocks.verifySession.mockResolvedValue(null);

    const result = await createPost(buildFormData(validInput));

    expect(result).toEqual({ error: "ログインしてください" });
    expect(postRepository.save).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("セッションに userId が含まれない場合もログインを求める", async () => {
    mocks.verifySession.mockResolvedValue({ isAuth: true, userId: "" });

    const result = await createPost(buildFormData(validInput));

    expect(result).toEqual({ error: "ログインしてください" });
    expect(postRepository.save).not.toHaveBeenCalled();
  });

  it("セッションのユーザーが DB に存在しない場合はエラーを返す", async () => {
    mocks.verifySession.mockResolvedValue(loggedIn);
    userRepository.findOneBy.mockResolvedValue(null);

    const result = await createPost(buildFormData(validInput));

    expect(result).toEqual({ error: "ユーザーが見つかりません" });
    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(postRepository.save).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("正常に作成できた場合はログインユーザーに紐づけて保存し、posts タグを無効化してトップへリダイレクトする", async () => {
    const user = { id: 1, userName: "taro" };
    const newPost = { ...validInput, user };
    mocks.verifySession.mockResolvedValue(loggedIn);
    userRepository.findOneBy.mockResolvedValue(user);
    postRepository.create.mockReturnValue(newPost);
    postRepository.save.mockResolvedValue({ ...newPost, id: 10 });

    await expect(createPost(buildFormData(validInput))).rejects.toBeInstanceOf(RedirectError);

    expect(postRepository.create).toHaveBeenCalledWith({
      title: "はじめての投稿",
      content: "本文です",
      user,
    });
    expect(postRepository.save).toHaveBeenCalledWith(newPost);
    expect(mocks.updateTag).toHaveBeenCalledTimes(1);
    expect(mocks.updateTag).toHaveBeenCalledWith("posts");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("保存中に例外が発生した場合はエラーを返し、キャッシュ無効化もリダイレクトもしない", async () => {
    mocks.verifySession.mockResolvedValue(loggedIn);
    userRepository.findOneBy.mockResolvedValue({ id: 1 });
    postRepository.create.mockReturnValue({});
    postRepository.save.mockRejectedValue(new Error("DB error"));

    const result = await createPost(buildFormData(validInput));

    expect(result).toEqual({ error: "投稿の作成中にエラーが発生しました" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("セッション確認で例外が発生した場合もエラーを返す", async () => {
    mocks.verifySession.mockRejectedValue(new Error("cookie error"));

    const result = await createPost(buildFormData(validInput));

    expect(result).toEqual({ error: "投稿の作成中にエラーが発生しました" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("getPosts（投稿一覧取得）", () => {
  it("posts タグでキャッシュし、ユーザー付きで作成日時の降順に取得する", async () => {
    postRepository.find.mockResolvedValue([]);

    await getPosts();

    expect(mocks.cacheTag).toHaveBeenCalledWith("posts");
    expect(postRepository.find).toHaveBeenCalledWith({
      relations: { user: true },
      order: { createdAt: "DESC" },
    });
  });

  it("投稿とユーザーをプレーンオブジェクトに変換して返す", async () => {
    const user = { id: 1, userName: "taro" };
    const posts = [
      { id: 2, title: "B", content: "b", user },
      { id: 1, title: "A", content: "a", user },
    ];
    postRepository.find.mockResolvedValue(posts);

    const result = await getPosts();

    expect(result).toEqual(posts);
    expect(result[0]).not.toBe(posts[0]);
    expect(result[0].user).not.toBe(user);
  });

  it("投稿が 0 件の場合は空配列を返す", async () => {
    postRepository.find.mockResolvedValue([]);

    await expect(getPosts()).resolves.toEqual([]);
  });
});

describe("getPost（投稿詳細取得）", () => {
  it("post-<id> タグでキャッシュし、ID とユーザーを指定して取得する", async () => {
    postRepository.findOne.mockResolvedValue(null);

    await getPost(5);

    expect(mocks.cacheTag).toHaveBeenCalledWith("post-5");
    expect(postRepository.findOne).toHaveBeenCalledWith({
      where: { id: 5 },
      relations: { user: true },
    });
  });

  it("存在しない投稿の場合は null を返す", async () => {
    postRepository.findOne.mockResolvedValue(null);

    await expect(getPost(999)).resolves.toBeNull();
  });

  it("投稿が存在する場合はユーザーを含むプレーンオブジェクトを返す", async () => {
    const user = { id: 1, userName: "taro" };
    const post = { id: 5, title: "T", content: "C", user };
    postRepository.findOne.mockResolvedValue(post);

    const result = await getPost(5);

    expect(result).toEqual(post);
    expect(result).not.toBe(post);
    expect(result?.user).not.toBe(user);
  });
});

describe("deletePost（投稿削除）", () => {
  it("未ログインの場合はエラーを返し、DB にアクセスしない", async () => {
    mocks.verifySession.mockResolvedValue(null);

    const result = await deletePost(1);

    expect(result).toEqual({ error: "ログインしてください" });
    expect(mocks.getRepository).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("存在しない投稿の場合はエラーを返す", async () => {
    mocks.verifySession.mockResolvedValue(loggedIn);
    postRepository.findOne.mockResolvedValue(null);

    const result = await deletePost(999);

    expect(result).toEqual({ error: "投稿が見つかりません" });
    expect(postRepository.findOne).toHaveBeenCalledWith({
      where: { id: 999 },
      relations: { user: true },
    });
    expect(postRepository.remove).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("他人の投稿は削除できずエラーを返す", async () => {
    mocks.verifySession.mockResolvedValue(loggedIn);
    postRepository.findOne.mockResolvedValue({ id: 3, user: { id: 2 } });

    const result = await deletePost(3);

    expect(result).toEqual({ error: "削除権限がありません" });
    expect(postRepository.remove).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("自分の投稿は削除し、posts と post-<id> タグを無効化してトップへリダイレクトする", async () => {
    const post = { id: 3, user: { id: 1 } };
    mocks.verifySession.mockResolvedValue(loggedIn);
    postRepository.findOne.mockResolvedValue(post);

    await expect(deletePost(3)).rejects.toBeInstanceOf(RedirectError);

    expect(postRepository.remove).toHaveBeenCalledWith(post);
    expect(mocks.updateTag).toHaveBeenCalledWith("posts");
    expect(mocks.updateTag).toHaveBeenCalledWith("post-3");
    expect(mocks.updateTag).toHaveBeenCalledTimes(2);
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("削除処理で例外が発生した場合は例外がそのまま送出され、キャッシュ無効化しない（現状の挙動）", async () => {
    mocks.verifySession.mockResolvedValue(loggedIn);
    postRepository.findOne.mockResolvedValue({ id: 3, user: { id: 1 } });
    postRepository.remove.mockRejectedValue(new Error("DB error"));

    await expect(deletePost(3)).rejects.toThrow("DB error");

    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
