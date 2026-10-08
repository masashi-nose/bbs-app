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
import SubmitButton from "@/app/SubmitButton";
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
    <div className="container" style={{ maxWidth: "400px", marginTop: "50px" }}>
      <div className="card">
        <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
          アカウント登録
        </h2>
        <form ref={formRef} action={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              ユーザー名
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-input"
              placeholder={`ユーザー名（${USERNAME_MAX_LENGTH}文字以内）`}
              autoComplete="username"
              maxLength={USERNAME_MAX_LENGTH}
              value={values.username}
              onChange={handleChange("username")}
              onBlur={handleBlur("username")}
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? "username-error" : undefined}
              required
            />
            {usernameError && (
              <p id="username-error" className="error-message">
                {usernameError}
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="example@email.com"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              value={values.email}
              onChange={handleChange("email")}
              onBlur={handleBlur("email")}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              required
            />
            {emailError && (
              <p id="email-error" className="error-message">
                {emailError}
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="********"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={values.password}
              onChange={handleChange("password")}
              onBlur={handleBlur("password")}
              aria-invalid={!!passwordError}
              aria-describedby={
                passwordError ? "password-error password-rules" : "password-rules"
              }
              required
            />
            {passwordError && (
              <p id="password-error" className="error-message">
                {passwordError}
              </p>
            )}
            <ul id="password-rules" className="password-rules" aria-label="必要な条件">
              {PASSWORD_RULES.map((rule) => {
                const met = values.password.length > 0 && rule.test(values.password);
                return (
                  <li key={rule.key} className={met ? "met" : undefined}>
                    {met ? "✓" : "・"} {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <SubmitButton label="登録する" pendingLabel="登録中…" />
        </form>
        <p style={{ textAlign: "center", fontSize: "14px" }}>
          すでにアカウントをお持ちですか？ <br />
          <Link href="/login" style={{ color: "#0070f3" }}>
            ログインはこちら
          </Link>
        </p>
      </div>
    </div>
  );
}
