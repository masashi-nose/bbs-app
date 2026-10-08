"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { User } from "@/entities/User";
import { getRepository } from "@/utils/data-source";
import { createSession, deleteSession } from "@/utils/session";

export async function signup(formData: FormData) {
  const userName = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!userName || !email || !password) {
    return { error: "すべてのフィールドを入力してください。" };
  }

  try {
    const userRepository = await getRepository(User);

    // メールアドレスの重複チェック
    const existingUser = await userRepository.findOneBy({ email });
    if (existingUser) {
      return { error: "このメールアドレスは既に使用されています" };
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
    console.error(e);
    return { error: "ユーザー登録中にエラーが発生しました" };
  }
  redirect("/");
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

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
