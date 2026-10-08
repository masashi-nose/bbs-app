import { z } from "zod";

// FE（クライアントページ）と BE（Server Actions）で共有するバリデーション定義

export const USERNAME_MAX_LENGTH = 20;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt は 72 バイトを超えた分を無視するため上限を合わせる（半角のみ許可なので文字数 = バイト数）
export const PASSWORD_MAX_LENGTH = 72;

type PasswordRule = {
  key: string;
  label: string;
  message: string;
  test: (password: string) => boolean;
};

// パスワードの条件。スキーマと登録画面のチェックリストの両方から参照する
export const PASSWORD_RULES: PasswordRule[] = [
  {
    key: "length",
    label: `${PASSWORD_MIN_LENGTH}〜${PASSWORD_MAX_LENGTH}文字`,
    message: `パスワードは${PASSWORD_MIN_LENGTH}〜${PASSWORD_MAX_LENGTH}文字で入力してください`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    key: "uppercase",
    label: "英大文字を含む",
    message: "パスワードには英大文字を含めてください",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: "lowercase",
    label: "英小文字を含む",
    message: "パスワードには英小文字を含めてください",
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: "digit",
    label: "数字を含む",
    message: "パスワードには数字を含めてください",
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: "ascii",
    label: "半角英数字・記号のみ",
    message: "パスワードは半角英数字・記号のみで入力してください",
    test: (p) => p.length === 0 || /^[\x21-\x7E]+$/.test(p),
  },
];

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "メールアドレスを入力してください")
  .max(EMAIL_MAX_LENGTH, `メールアドレスは${EMAIL_MAX_LENGTH}文字以内で入力してください`)
  .pipe(z.email("メールアドレスの形式が正しくありません"));

export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "ユーザー名を入力してください")
    .max(USERNAME_MAX_LENGTH, `ユーザー名は${USERNAME_MAX_LENGTH}文字以内で入力してください`),
  email: emailSchema,
  password: z.string().superRefine((password, ctx) => {
    if (password.length === 0) {
      ctx.addIssue({ code: "custom", message: "パスワードを入力してください" });
      return;
    }
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(password)) {
        ctx.addIssue({ code: "custom", message: rule.message });
      }
    }
  }),
});

// ログインでは既存ユーザーを締め出さないよう、パスワードポリシーは適用しない
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .max(PASSWORD_MAX_LENGTH, `パスワードは${PASSWORD_MAX_LENGTH}文字以内で入力してください`),
});

export type FieldErrors<T extends z.ZodObject> = Partial<Record<keyof z.input<T>, string[]>>;

export type ValidationResult<T extends z.ZodObject> =
  | { success: true; data: z.output<T> }
  | { success: false; fieldErrors: FieldErrors<T> };

export function validate<T extends z.ZodObject>(schema: T, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    fieldErrors: z.flattenError(result.error).fieldErrors as FieldErrors<T>,
  };
}

// FormData の値は null や File の可能性があるため、文字列以外は空文字として扱う
export function parseForm<T extends z.ZodObject>(
  schema: T,
  formData: FormData,
): ValidationResult<T> {
  const input = Object.fromEntries(
    Object.keys(schema.shape).map((key) => {
      const value = formData.get(key);
      return [key, typeof value === "string" ? value : ""];
    }),
  );
  return validate(schema, input);
}

export type AuthFieldErrors = FieldErrors<typeof signupSchema>;

export type AuthResult = { error?: string; fieldErrors?: AuthFieldErrors };
