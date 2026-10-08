import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeletePostButton from "./DeletePostButton";
import { deletePost } from "@/actions/post";

vi.mock("@/actions/post", () => ({ deletePost: vi.fn() }));

const mockedDeletePost = vi.mocked(deletePost);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("投稿削除ボタン", () => {
  it("削除ボタンを表示する", () => {
    render(<DeletePostButton postId={1} />);

    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("クリックすると削除確認ダイアログを表示する", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeletePostButton postId={1} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "削除" }));

    expect(confirmSpy).toHaveBeenCalledWith("本当に削除しますか？");
  });

  it("確認ダイアログで OK を選ぶと対象の投稿 ID で deletePost を呼ぶ", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockedDeletePost.mockResolvedValue(undefined as never);
    render(<DeletePostButton postId={42} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(mockedDeletePost).toHaveBeenCalledWith(42));
    expect(mockedDeletePost).toHaveBeenCalledTimes(1);
  });

  it("確認ダイアログでキャンセルを選ぶと deletePost を呼ばない", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeletePostButton postId={42} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "削除" }));

    expect(mockedDeletePost).not.toHaveBeenCalled();
  });

  it("deletePost がエラーを返しても画面には何も表示しない（現状の挙動）", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockedDeletePost.mockResolvedValue({ error: "削除権限がありません" });
    render(<DeletePostButton postId={42} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(mockedDeletePost).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("削除権限がありません")).not.toBeInTheDocument();
  });
});
