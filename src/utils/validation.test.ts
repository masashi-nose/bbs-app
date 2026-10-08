// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PASSWORD_RULES, loginSchema, parseForm, signupSchema, validate } from "./validation";

const validSignup = {
  username: "taro",
  email: "taro@example.com",
  password: "Password123",
};

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function signupErrors(input: Partial<typeof validSignup>) {
  const result = validate(signupSchema, { ...validSignup, ...input });
  return result.success ? {} : result.fieldErrors;
}

describe("signupSchema（新規登録）", () => {
  it("条件を満たす入力は成功する", () => {
    expect(validate(signupSchema, validSignup)).toEqual({ success: true, data: validSignup });
  });

  describe("ユーザー名", () => {
    it("前後の空白を除去する", () => {
      const result = validate(signupSchema, { ...validSignup, username: "  taro  " });
      expect(result.success && result.data.username).toBe("taro");
    });

    it.each([
      ["空文字", ""],
      ["空白のみ", "   "],
      ["全角空白のみ", "\u3000\u3000"],
    ])("%sはエラーになる", (_label, username) => {
      expect(signupErrors({ username }).username).toEqual(["ユーザー名を入力してください"]);
    });

    it("20文字は許可し、21文字はエラーになる", () => {
      expect(signupErrors({ username: "あ".repeat(20) }).username).toBeUndefined();
      expect(signupErrors({ username: "あ".repeat(21) }).username).toEqual([
        "ユーザー名は20文字以内で入力してください",
      ]);
    });
  });

  describe("メールアドレス", () => {
    it("前後の空白を除去して小文字化する", () => {
      const result = validate(signupSchema, { ...validSignup, email: "  Taro@Example.COM " });
      expect(result.success && result.data.email).toBe("taro@example.com");
    });

    it("空文字は入力を促すエラーのみを返す", () => {
      expect(signupErrors({ email: "" }).email).toEqual(["メールアドレスを入力してください"]);
    });

    it.each(["invalid-email", "taro@", "@example.com", "taro@example"])(
      "形式が不正な %s はエラーになる",
      (email) => {
        expect(signupErrors({ email }).email).toEqual(["メールアドレスの形式が正しくありません"]);
      },
    );

    it("254文字は許可し、255文字はエラーになる", () => {
      // 形式チェックを通すためドメイン部を63文字ごとのラベルに分ける
      const domain = (n: number) => `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(n)}.com`;
      const email254 = `${"a".repeat(64)}@${domain(57)}`;
      expect(email254).toHaveLength(254);
      expect(signupErrors({ email: email254 }).email).toBeUndefined();

      const email255 = `${"a".repeat(64)}@${domain(58)}`;
      expect(signupErrors({ email: email255 }).email).toEqual([
        "メールアドレスは254文字以内で入力してください",
      ]);
    });
  });

  describe("パスワード", () => {
    it("空文字は入力を促すエラーのみを返す", () => {
      expect(signupErrors({ password: "" }).password).toEqual(["パスワードを入力してください"]);
    });

    it("8文字と72文字は許可する", () => {
      expect(signupErrors({ password: "Passwor1" }).password).toBeUndefined();
      expect(signupErrors({ password: `Aa1${"x".repeat(69)}` }).password).toBeUndefined();
    });

    it.each([
      ["7文字", "Passwo1"],
      ["73文字", `Aa1${"x".repeat(70)}`],
    ])("%sはエラーになる", (_label, password) => {
      expect(signupErrors({ password }).password).toEqual([
        "パスワードは8〜72文字で入力してください",
      ]);
    });

    it.each([
      ["英大文字", "password123", "パスワードには英大文字を含めてください"],
      ["英小文字", "PASSWORD123", "パスワードには英小文字を含めてください"],
      ["数字", "Passwordabc", "パスワードには数字を含めてください"],
    ])("%sを含まない場合はエラーになる", (_label, password, message) => {
      expect(signupErrors({ password }).password).toEqual([message]);
    });

    it.each([
      ["全角文字", "Password123あ"],
      ["空白", "Password 123"],
    ])("%sを含む場合はエラーになる", (_label, password) => {
      expect(signupErrors({ password }).password).toEqual([
        "パスワードは半角英数字・記号のみで入力してください",
      ]);
    });

    it("記号は許可する", () => {
      expect(signupErrors({ password: "Pass!@#123" }).password).toBeUndefined();
    });

    it("満たしていない条件をすべて返す", () => {
      expect(signupErrors({ password: "abc" }).password).toEqual([
        "パスワードは8〜72文字で入力してください",
        "パスワードには英大文字を含めてください",
        "パスワードには数字を含めてください",
      ]);
    });
  });
});

describe("PASSWORD_RULES", () => {
  it("条件ごとの判定結果を返す", () => {
    const results = Object.fromEntries(PASSWORD_RULES.map((r) => [r.key, r.test("abc")]));
    expect(results).toEqual({
      length: false,
      uppercase: false,
      lowercase: true,
      digit: false,
      ascii: true,
    });
  });
});

describe("loginSchema（ログイン）", () => {
  it("パスワードポリシーを満たさないパスワードでも成功する", () => {
    const result = validate(loginSchema, { email: "taro@example.com", password: "weak" });
    expect(result.success).toBe(true);
  });

  it("メールアドレスを正規化する", () => {
    const result = validate(loginSchema, { email: " Taro@Example.com", password: "weak" });
    expect(result.success && result.data.email).toBe("taro@example.com");
  });

  it("72文字のパスワードは許可する", () => {
    const result = validate(loginSchema, { email: "taro@example.com", password: "x".repeat(72) });
    expect(result.success).toBe(true);
  });

  it("未入力・形式不正・72文字超過はエラーになる", () => {
    const empty = validate(loginSchema, { email: "", password: "" });
    expect(empty.success === false && empty.fieldErrors).toEqual({
      email: ["メールアドレスを入力してください"],
      password: ["パスワードを入力してください"],
    });

    const invalid = validate(loginSchema, { email: "invalid", password: "x".repeat(73) });
    expect(invalid.success === false && invalid.fieldErrors).toEqual({
      email: ["メールアドレスの形式が正しくありません"],
      password: ["パスワードは72文字以内で入力してください"],
    });
  });
});

describe("parseForm", () => {
  it("FormData をスキーマで検証する", () => {
    expect(parseForm(signupSchema, buildFormData(validSignup))).toEqual({
      success: true,
      data: validSignup,
    });
  });

  it("送信されていない項目や File は空文字として扱う", () => {
    const formData = buildFormData({ email: "taro@example.com" });
    formData.append("password", new File(["x"], "x.txt"));

    const result = parseForm(loginSchema, formData);

    expect(result.success === false && result.fieldErrors).toEqual({
      password: ["パスワードを入力してください"],
    });
  });
});
