import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";
import { signup } from "@/actions/auth";

vi.mock("@/actions/auth", () => ({ signup: vi.fn() }));

const mockedSignup = vi.mocked(signup);

beforeEach(() => {
  vi.resetAllMocks();
});

type Input = { username?: string; email?: string; password?: string };

async function fillAndSubmit({ username = "", email = "", password = "" }: Input) {
  const user = userEvent.setup();
  const fields: [string, string][] = [
    ["ユーザー名", username],
    ["メールアドレス", email],
    ["パスワード", password],
  ];
  for (const [label, value] of fields) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    if (value) await user.type(input, value);
  }
  await user.click(screen.getByRole("button", { name: "登録する" }));
}

const validInput = {
  username: "taro",
  email: "taro@example.com",
  password: "password123",
};

describe("アカウント登録画面", () => {
  it("見出し・入力欄・登録ボタン・ログインリンクを表示する", () => {
    render(<SignupPage />);

    expect(screen.getByRole("heading", { name: "アカウント登録" })).toBeInTheDocument();
    expect(screen.getByLabelText("ユーザー名")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "登録する" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインはこちら" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("すべての入力欄が必須入力になっている", () => {
    render(<SignupPage />);

    expect(screen.getByLabelText("ユーザー名")).toBeRequired();
    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    expect(screen.getByLabelText("パスワード")).toBeRequired();
  });

  it("入力内容を FormData として signup アクションに渡す", async () => {
    mockedSignup.mockResolvedValue(undefined as never);
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    await waitFor(() => expect(mockedSignup).toHaveBeenCalledTimes(1));
    const formData = mockedSignup.mock.calls[0][0];
    expect(formData.get("username")).toBe("taro");
    expect(formData.get("email")).toBe("taro@example.com");
    expect(formData.get("password")).toBe("password123");
  });

  it("メールアドレスが重複している場合は signup が返したエラーを表示する", async () => {
    mockedSignup.mockResolvedValue({ error: "このメールアドレスは既に使用されています" });
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    expect(
      await screen.findByText("このメールアドレスは既に使用されています"),
    ).toBeInTheDocument();
  });

  it("サーバーエラーの場合は signup が返したエラーを表示する", async () => {
    mockedSignup.mockResolvedValue({ error: "ユーザー登録中にエラーが発生しました" });
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    expect(await screen.findByText("ユーザー登録中にエラーが発生しました")).toBeInTheDocument();
  });

  it("再送信して成功した場合は前回のエラーメッセージが消える", async () => {
    mockedSignup
      .mockResolvedValueOnce({ error: "このメールアドレスは既に使用されています" })
      .mockResolvedValueOnce(undefined as never);
    render(<SignupPage />);

    await fillAndSubmit(validInput);
    expect(
      await screen.findByText("このメールアドレスは既に使用されています"),
    ).toBeInTheDocument();

    await fillAndSubmit({ ...validInput, email: "jiro@example.com" });
    await waitFor(() => expect(mockedSignup).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByText("このメールアドレスは既に使用されています"),
      ).not.toBeInTheDocument(),
    );
  });

  it.each([
    ["ユーザー名", { ...validInput, username: "" }],
    ["メールアドレス", { ...validInput, email: "" }],
    ["パスワード", { ...validInput, password: "" }],
  ])("%sが未入力の場合は signup を呼ばない", async (_label, input) => {
    render(<SignupPage />);

    await fillAndSubmit(input);

    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it("メールアドレスの形式が不正な場合は signup を呼ばない", async () => {
    render(<SignupPage />);

    await fillAndSubmit({ ...validInput, email: "invalid-email" });

    expect(mockedSignup).not.toHaveBeenCalled();
  });
});
