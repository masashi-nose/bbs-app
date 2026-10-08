import { render, screen, waitFor, within } from "@testing-library/react";
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
  password: "Password123",
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
    expect(formData.get("password")).toBe("Password123");
  });

  it("メールアドレスが重複している場合はメールアドレス欄にエラーを表示してフォーカスを移す", async () => {
    mockedSignup.mockResolvedValue({
      fieldErrors: { email: ["このメールアドレスは既に使用されています"] },
    });
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    expect(
      await screen.findByText("このメールアドレスは既に使用されています"),
    ).toBeInTheDocument();
    const email = screen.getByLabelText("メールアドレス");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
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

  it("入力欄に最大文字数と autocomplete が設定されている", () => {
    render(<SignupPage />);

    expect(screen.getByLabelText("ユーザー名")).toHaveAttribute("maxlength", "20");
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("maxlength", "254");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("maxlength", "72");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("autocomplete", "new-password");
  });

  it("パスワードの条件チェックリストが入力に応じて切り替わる", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    const rules = within(screen.getByRole("list", { name: "必要な条件" }));
    const rule = (label: string) => rules.getByText(label, { exact: false });

    for (const label of ["8〜72文字", "英大文字を含む", "英小文字を含む", "数字を含む"]) {
      expect(rule(label)).not.toHaveAttribute("data-met", "true");
    }

    await user.type(screen.getByLabelText("パスワード"), "abc");
    expect(rule("英小文字を含む")).toHaveAttribute("data-met", "true");
    expect(rule("英大文字を含む")).not.toHaveAttribute("data-met", "true");
    expect(rule("8〜72文字")).not.toHaveAttribute("data-met", "true");

    await user.type(screen.getByLabelText("パスワード"), "DEF123");
    for (const label of ["8〜72文字", "英大文字を含む", "英小文字を含む", "数字を含む"]) {
      expect(rule(label)).toHaveAttribute("data-met", "true");
    }
  });

  it("入力欄からフォーカスが外れるまでは項目ごとのエラーを表示しない", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    const password = screen.getByLabelText("パスワード");

    await user.type(password, "abc");
    expect(screen.queryByText("パスワードは8〜72文字で入力してください")).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText("パスワードは8〜72文字で入力してください")).toBeInTheDocument();
    expect(password).toHaveAttribute("aria-invalid", "true");
  });

  it("ユーザー名が空白のみの場合はエラーを表示する", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("ユーザー名"), "   ");
    await user.tab();

    expect(screen.getByText("ユーザー名を入力してください")).toBeInTheDocument();
  });

  it.each([
    ["7文字", "Passwo1", "パスワードは8〜72文字で入力してください"],
    ["英大文字なし", "password123", "パスワードには英大文字を含めてください"],
    ["数字なし", "Passwordabc", "パスワードには数字を含めてください"],
  ])("パスワードが%sの場合はエラーを表示し、signup を呼ばない", async (_label, password, message) => {
    render(<SignupPage />);

    await fillAndSubmit({ ...validInput, password });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it("signup が返した項目ごとのエラーを該当の入力欄に表示し、入力し直すと消える", async () => {
    const user = userEvent.setup();
    mockedSignup.mockResolvedValue({
      fieldErrors: { email: ["サーバー側のメールアドレスエラー"] },
    });
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    expect(await screen.findByText("サーバー側のメールアドレスエラー")).toBeInTheDocument();
    // 欄に紐付くエラーのみの場合は全体エラーを出さない
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("メールアドレス"), "x");
    expect(screen.queryByText("サーバー側のメールアドレスエラー")).not.toBeInTheDocument();
  });

  it("全角文字を含むパスワードはチェックリストとエラーで伝える", async () => {
    render(<SignupPage />);
    const rule = within(screen.getByRole("list", { name: "必要な条件" })).getByText(
      "半角英数字・記号のみ",
      { exact: false },
    );

    await fillAndSubmit({ ...validInput, password: "Password123あ" });

    expect(rule).not.toHaveAttribute("data-met", "true");
    expect(
      await screen.findByText("パスワードは半角英数字・記号のみで入力してください"),
    ).toBeInTheDocument();
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it("クライアント側の検証で止めた場合は最初のエラー項目にフォーカスを移す", async () => {
    render(<SignupPage />);

    await fillAndSubmit({ ...validInput, password: "short" });

    expect(screen.getByLabelText("パスワード")).toHaveFocus();
  });

  it("エラー後も入力値を保持する", async () => {
    mockedSignup.mockResolvedValue({ error: "ユーザー登録中にエラーが発生しました" });
    render(<SignupPage />);

    await fillAndSubmit(validInput);
    await screen.findByText("ユーザー登録中にエラーが発生しました");

    expect(screen.getByLabelText("ユーザー名")).toHaveValue(validInput.username);
    expect(screen.getByLabelText("メールアドレス")).toHaveValue(validInput.email);
    expect(screen.getByLabelText("パスワード")).toHaveValue(validInput.password);
  });

  it("全体エラーは role=alert で通知し、入力し直すと消える", async () => {
    const user = userEvent.setup();
    mockedSignup.mockResolvedValue({ error: "ユーザー登録中にエラーが発生しました" });
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ユーザー登録中にエラーが発生しました",
    );
    await user.type(screen.getByLabelText("ユーザー名"), "x");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("送信中はボタンを無効化して二重送信を防ぐ", async () => {
    let resolve!: (value: undefined) => void;
    mockedSignup.mockReturnValue(new Promise((r) => (resolve = r)) as never);
    render(<SignupPage />);

    await fillAndSubmit(validInput);

    const button = await screen.findByRole("button", { name: "登録中…" });
    expect(button).toBeDisabled();
    // 見た目はローディングマークのみで、処理中のラベルは読み上げ用
    expect(within(button).getByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByText("登録中…")).toHaveClass("sr-only");

    resolve(undefined);
    expect(await screen.findByRole("button", { name: "登録する" })).toBeEnabled();
  });
});
