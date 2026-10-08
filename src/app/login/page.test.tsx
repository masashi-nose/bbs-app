import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";
import { login } from "@/actions/auth";

vi.mock("@/actions/auth", () => ({ login: vi.fn() }));

const mockedLogin = vi.mocked(login);

beforeEach(() => {
  vi.resetAllMocks();
});

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  const emailInput = screen.getByLabelText("メールアドレス");
  const passwordInput = screen.getByLabelText("パスワード");
  await user.clear(emailInput);
  await user.clear(passwordInput);
  if (email) await user.type(emailInput, email);
  if (password) await user.type(passwordInput, password);
  await user.click(screen.getByRole("button", { name: "ログイン" }));
}

describe("ログイン画面", () => {
  it("見出し・入力欄・ログインボタン・新規登録リンクを表示する", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新規登録はこちら" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("メールアドレスとパスワードは必須入力になっている", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    expect(screen.getByLabelText("パスワード")).toBeRequired();
  });

  it("入力内容を FormData として login アクションに渡す", async () => {
    mockedLogin.mockResolvedValue(undefined as never);
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "password123");

    await waitFor(() => expect(mockedLogin).toHaveBeenCalledTimes(1));
    const formData = mockedLogin.mock.calls[0][0];
    expect(formData.get("email")).toBe("taro@example.com");
    expect(formData.get("password")).toBe("password123");
  });

  it("login がエラーを返した場合はエラーメッセージを表示する", async () => {
    mockedLogin.mockResolvedValue({
      error: "メールアドレスまたはパスワードが正しくありません",
    });
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "wrong");

    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeInTheDocument();
  });

  it("初期表示ではエラーメッセージを表示しない", () => {
    render(<LoginPage />);

    expect(
      screen.queryByText("メールアドレスまたはパスワードが正しくありません"),
    ).not.toBeInTheDocument();
  });

  it("再送信して成功した場合は前回のエラーメッセージが消える", async () => {
    mockedLogin
      .mockResolvedValueOnce({ error: "メールアドレスまたはパスワードが正しくありません" })
      .mockResolvedValueOnce(undefined as never);
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "wrong");
    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeInTheDocument();

    await fillAndSubmit("taro@example.com", "password123");
    await waitFor(() => expect(mockedLogin).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByText("メールアドレスまたはパスワードが正しくありません"),
      ).not.toBeInTheDocument(),
    );
  });

  it("必須項目が未入力のまま送信しても login を呼ばない", async () => {
    render(<LoginPage />);

    await fillAndSubmit("", "");

    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("パスワードのみ未入力の場合も login を呼ばない", async () => {
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "");

    expect(mockedLogin).not.toHaveBeenCalled();
  });
});
