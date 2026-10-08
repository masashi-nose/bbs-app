"use client";

import { signup } from "@/actions/auth";
import {
  type AuthFieldErrors,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_RULES,
  USERNAME_MAX_LENGTH,
  signupSchema,
  validate,
} from "@/utils/validation";
import SubmitButton from "@/components/SubmitButton";
import Card from "@/components/ui/Card";
import { FieldError, TextField } from "@/components/ui/TextField";
import Link from "next/link";
import { useRef, useState } from "react";

type Field = "username" | "email" | "password";

const FIELDS: Field[] = ["username", "email", "password"];

export default function SignupPage() {
  const [values, setValues] = useState<Record<Field, string>>({
    username: "",
    email: "",
    password: "",
  });
  // 入力欄からフォーカスが外れた（または送信した）項目だけエラーを表示する
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const validation = validate(signupSchema, values);
  const clientFieldErrors = validation.success ? {} : validation.fieldErrors;

  const fieldError = (field: Field) =>
    touched[field]
      ? (clientFieldErrors[field]?.[0] ?? serverFieldErrors[field]?.[0])
      : undefined;

  const handleChange = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setServerFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  // 送信に失敗したとき、最初のエラー項目にフォーカスを移してエラーに気付けるようにする
  const focusFirstError = (errors: AuthFieldErrors) => {
    const field = FIELDS.find((f) => errors[f]?.length);
    const input = field && formRef.current?.elements.namedItem(field);
    if (input instanceof HTMLInputElement) input.focus();
  };

  const handleBlur = (field: Field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setTouched({ username: true, email: true, password: true });
    if (!validation.success) {
      focusFirstError(validation.fieldErrors);
      return;
    }
    const result = await signup(formData);
    if (result) {
      setError(result.error ?? null);
      setServerFieldErrors(result.fieldErrors ?? {});
      focusFirstError(result.fieldErrors ?? {});
    }
  };

  const usernameError = fieldError("username");
  const emailError = fieldError("email");
  const passwordError = fieldError("password");

  return (
    <div className="mx-auto mt-12 max-w-[400px]">
      <Card>
        <h2 className="mb-5 text-center text-2xl font-bold">アカウント登録</h2>
        <form ref={formRef} action={handleSubmit}>
          <TextField
            id="username"
            label="ユーザー名"
            type="text"
            placeholder={`ユーザー名（${USERNAME_MAX_LENGTH}文字以内）`}
            autoComplete="username"
            maxLength={USERNAME_MAX_LENGTH}
            value={values.username}
            onChange={handleChange("username")}
            onBlur={handleBlur("username")}
            error={usernameError}
            required
          />
          <TextField
            id="email"
            label="メールアドレス"
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={values.email}
            onChange={handleChange("email")}
            onBlur={handleBlur("email")}
            error={emailError}
            required
          />
          <TextField
            id="password"
            label="パスワード"
            type="password"
            placeholder="********"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={values.password}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
            error={passwordError}
            describedBy="password-rules"
            required
          >
            <ul id="password-rules" className="mt-2 text-[13px] text-muted" aria-label="必要な条件">
              {PASSWORD_RULES.map((rule) => {
                const met = values.password.length > 0 && rule.test(values.password);
                return (
                  <li key={rule.key} data-met={met} className="data-[met=true]:text-success">
                    {met ? "✓" : "・"} {rule.label}
                  </li>
                );
              })}
            </ul>
          </TextField>
          {error && (
            <FieldError role="alert" className="mb-4">
              {error}
            </FieldError>
          )}
          <SubmitButton label="登録する" pendingLabel="登録中…" fullWidth />
        </form>
        <p className="mt-4 text-center text-sm">
          すでにアカウントをお持ちですか？ <br />
          <Link href="/login" className="text-primary hover:underline">
            ログインはこちら
          </Link>
        </p>
      </Card>
    </div>
  );
}
