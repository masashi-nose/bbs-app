"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { QueryFailedError } from "typeorm";
import { User } from "@/entities/User";
import { getRepository } from "@/utils/data-source";
import { createSession, deleteSession } from "@/utils/session";
import {
  type AuthResult,
  loginSchema,
  parseForm,
  signupSchema,
} from "@/utils/validation";

// 入力欄に紐付くエラーは fieldErrors のみで返し、全体エラー（error）は欄に紐付かないものに限る
const EMAIL_TAKEN_RESULT: AuthResult = {
  fieldErrors: { email: ["このメールアドレスは既に使用されています"] },
};

// 一意制約違反（Postgres: 23505 / SQLite: SQLITE_CONSTRAINT）
function isUniqueViolation(e: unknown) {
  if (!(e instanceof QueryFailedError)) return false;
  const code = (e.driverError as { code?: string } | undefined)?.code;
  return code === "23505" || code === "SQLITE_CONSTRAINT";
}

export async function signup(formData: FormData): Promise<AuthResult | undefined> {
  const parsed = parseForm(signupSchema, formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.fieldErrors };
  }
  // ユーザー名は前後の空白を除去、メールアドレスは小文字化済み
  const { username: userName, email, password } = parsed.data;

  try {
    const userRepository = await getRepository(User);

    // メールアドレスの重複チェック
    const existingUser = await userRepository.findOneBy({ email });
    if (existingUser) {
      return EMAIL_TAKEN_RESULT;
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザー作成
    const newUser = userRepository.create({
      userName,
      email,
      password: hashedPassword,
    });

    const savedUser = await userRepository.save(newUser);
    await createSession(savedUser.id.toString());
  } catch (e) {
    // 重複チェックと保存の間に同じメールアドレスで登録された場合
    if (isUniqueViolation(e)) {
      return EMAIL_TAKEN_RESULT;
    }
    console.error(e);
    return { error: "ユーザー登録中にエラーが発生しました" };
  }
  redirect("/");
}

export async function login(formData: FormData): Promise<AuthResult | undefined> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.fieldErrors };
  }
  const { email, password } = parsed.data;

  try {
    const userRepository = await getRepository(User);
    const user = await userRepository.findOneBy({ email });

    if (!user) {
      return { error: "メールアドレスまたはパスワードが正しくありません" };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return { error: "メールアドレスまたはパスワードが正しくありません" };
    }

    await createSession(user.id.toString());
  } catch (e) {
    console.error(e);
    return { error: "ログイン中にエラーが発生しました" };
  }
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
