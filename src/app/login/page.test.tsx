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

  it("入力欄に最大文字数と autocomplete が設定されている", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("maxlength", "254");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("maxlength", "72");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("パスワードポリシーを満たさないパスワードでも login を呼ぶ（既存ユーザーのため）", async () => {
    mockedLogin.mockResolvedValue(undefined as never);
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "weak");

    await waitFor(() => expect(mockedLogin).toHaveBeenCalledTimes(1));
  });

  it("フォーカスが外れたとき未入力の項目にエラーを表示する", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByLabelText("メールアドレス"));
    await user.tab();

    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("パスワードを入力してください")).not.toBeInTheDocument();
  });

  it("login が返した項目ごとのエラーを該当の入力欄に表示する", async () => {
    mockedLogin.mockResolvedValue({
      fieldErrors: { password: ["サーバー側のパスワードエラー"] },
    });
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "password123");

    expect(await screen.findByText("サーバー側のパスワードエラー")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("aria-invalid", "true");
  });

  it("ログインに失敗した場合は role=alert で通知し、入力値を保持する", async () => {
    mockedLogin.mockResolvedValue({
      error: "メールアドレスまたはパスワードが正しくありません",
    });
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "メールアドレスまたはパスワードが正しくありません",
    );
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("taro@example.com");
    expect(screen.getByLabelText("パスワード")).toHaveValue("wrong");
  });

  it("クライアント側の検証で止めた場合は最初のエラー項目にフォーカスを移す", async () => {
    render(<LoginPage />);

    // type="email" の制約を通る値で、スキーマの形式チェックだけに引っかける
    await fillAndSubmit("taro@example", "password123");

    expect(await screen.findByText("メールアドレスの形式が正しくありません")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveFocus();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("送信中はボタンを無効化して二重送信を防ぐ", async () => {
    let resolve!: (value: undefined) => void;
    mockedLogin.mockReturnValue(new Promise((r) => (resolve = r)) as never);
    render(<LoginPage />);

    await fillAndSubmit("taro@example.com", "password123");

    expect(await screen.findByRole("button", { name: "ログイン中…" })).toBeDisabled();

    resolve(undefined);
    expect(await screen.findByRole("button", { name: "ログイン" })).toBeEnabled();
  });
});
