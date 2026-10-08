import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreatePostPage from "./page";
import { createPost } from "@/actions/post";

vi.mock("@/actions/post", () => ({ createPost: vi.fn() }));

const mockedCreatePost = vi.mocked(createPost);

beforeEach(() => {
  vi.resetAllMocks();
});

async function fillAndSubmit(title: string, content: string) {
  const user = userEvent.setup();
  const titleInput = screen.getByLabelText("タイトル");
  const contentInput = screen.getByLabelText("本文");
  await user.clear(titleInput);
  await user.clear(contentInput);
  if (title) await user.type(titleInput, title);
  if (content) await user.type(contentInput, content);
  await user.click(screen.getByRole("button", { name: "投稿する" }));
}

describe("新規投稿画面", () => {
  it("見出し・タイトル入力欄・本文入力欄・投稿ボタンを表示する", () => {
    render(<CreatePostPage />);

    expect(screen.getByRole("heading", { name: "新規投稿" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "タイトル" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "本文" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "投稿する" })).toBeInTheDocument();
  });

  it("入力内容を FormData として createPost アクションに渡す", async () => {
    mockedCreatePost.mockResolvedValue(undefined as never);
    render(<CreatePostPage />);

    await fillAndSubmit("はじめての投稿", "本文です");

    await waitFor(() => expect(mockedCreatePost).toHaveBeenCalledTimes(1));
    const formData = mockedCreatePost.mock.calls[0][0];
    expect(formData.get("title")).toBe("はじめての投稿");
    expect(formData.get("content")).toBe("本文です");
  });

  it("本文の改行をそのまま送信する", async () => {
    mockedCreatePost.mockResolvedValue(undefined as never);
    render(<CreatePostPage />);

    await fillAndSubmit("タイトル", "1行目{Enter}2行目");

    await waitFor(() => expect(mockedCreatePost).toHaveBeenCalledTimes(1));
    expect(mockedCreatePost.mock.calls[0][0].get("content")).toMatch(/^1行目\r?\n2行目$/);
  });

  it("入力が空のまま送信した場合は createPost が返したエラーを表示する", async () => {
    // required 属性が無いためクライアント側では止まらず、サーバー側のバリデーション結果を表示する
    mockedCreatePost.mockResolvedValue({ error: "タイトルと本文を入力してください" });
    render(<CreatePostPage />);

    await fillAndSubmit("", "");

    expect(await screen.findByText("タイトルと本文を入力してください")).toBeInTheDocument();
    const formData = mockedCreatePost.mock.calls[0][0];
    expect(formData.get("title")).toBe("");
    expect(formData.get("content")).toBe("");
  });

  it("未ログインの場合は createPost が返したエラーを表示する", async () => {
    mockedCreatePost.mockResolvedValue({ error: "ログインしてください" });
    render(<CreatePostPage />);

    await fillAndSubmit("タイトル", "本文");

    expect(await screen.findByText("ログインしてください")).toBeInTheDocument();
  });

  it("初期表示ではエラーメッセージを表示しない", () => {
    render(<CreatePostPage />);

    expect(screen.queryByText("タイトルと本文を入力してください")).not.toBeInTheDocument();
  });

  it("再送信して成功した場合は前回のエラーメッセージが消える", async () => {
    mockedCreatePost
      .mockResolvedValueOnce({ error: "投稿の作成中にエラーが発生しました" })
      .mockResolvedValueOnce(undefined as never);
    render(<CreatePostPage />);

    await fillAndSubmit("タイトル", "本文");
    expect(await screen.findByText("投稿の作成中にエラーが発生しました")).toBeInTheDocument();

    await fillAndSubmit("タイトル", "本文");
    await waitFor(() => expect(mockedCreatePost).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText("投稿の作成中にエラーが発生しました")).not.toBeInTheDocument(),
    );
  });
});
