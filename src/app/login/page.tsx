"use client";

import { login } from "@/actions/auth";
import {
  type AuthFieldErrors,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  loginSchema,
  validate,
} from "@/utils/validation";
import SubmitButton from "@/components/SubmitButton";
import Card from "@/components/ui/Card";
import { FieldError, TextField } from "@/components/ui/TextField";
import Link from "next/link";
import { useRef, useState } from "react";

type Field = "email" | "password";

const FIELDS: Field[] = ["email", "password"];

export default function LoginPage() {
  const [values, setValues] = useState<Record<Field, string>>({ email: "", password: "" });
  // 入力欄からフォーカスが外れた（または送信した）項目だけエラーを表示する
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const validation = validate(loginSchema, values);
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
    setTouched({ email: true, password: true });
    if (!validation.success) {
      focusFirstError(validation.fieldErrors);
      return;
    }
    const result = await login(formData);
    if (result) {
      setError(result.error ?? null);
      setServerFieldErrors(result.fieldErrors ?? {});
      focusFirstError(result.fieldErrors ?? {});
    }
  };

  const emailError = fieldError("email");
  const passwordError = fieldError("password");

  return (
    <div className="mx-auto mt-12 max-w-[400px]">
      <Card>
        <h2 className="mb-5 text-center text-2xl font-bold">ログイン</h2>
        <form ref={formRef} action={handleSubmit}>
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
            autoComplete="current-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={values.password}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
            error={passwordError}
            required
          />
          {error && (
            <FieldError role="alert" className="mb-4">
              {error}
            </FieldError>
          )}
          <SubmitButton label="ログイン" pendingLabel="ログイン中…" fullWidth />
        </form>
        <p className="mt-4 text-center text-sm">
          アカウントをお持ちでないですか？
          <br />
          <Link href="/signup" className="text-primary hover:underline">
            新規登録はこちら
          </Link>
        </p>
      </Card>
    </div>
  );
}
