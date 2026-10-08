// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { decrypt, encrypt } from "./jwt";

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("encrypt（JWT 生成）", () => {
  it("HS256 で署名された JWT 文字列を返す", async () => {
    const token = await encrypt({ userId: "1" });

    expect(token.split(".")).toHaveLength(3);
    expect(decodeProtectedHeader(token)).toEqual({ alg: "HS256" });
  });

  it("ペイロードに発行日時と 7 日後の有効期限が設定される", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const token = await encrypt({ userId: "1" });
    const payload = decodeJwt(token);

    const now = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
    expect(payload.userId).toBe("1");
    expect(payload.iat).toBe(now);
    expect(payload.exp).toBe(now + SEVEN_DAYS_IN_SECONDS);
  });
});

describe("decrypt（JWT 検証）", () => {
  it("encrypt で生成したトークンを検証してペイロードを返す", async () => {
    const token = await encrypt({ userId: "123", role: "user" });

    const payload = await decrypt(token);

    expect(payload).toMatchObject({ userId: "123", role: "user" });
  });

  it("引数が undefined の場合は null を返す", async () => {
    await expect(decrypt(undefined)).resolves.toBeNull();
    expect(console.log).toHaveBeenCalledWith("Failed to verify session");
  });

  it("引数を省略した場合は null を返す", async () => {
    await expect(decrypt()).resolves.toBeNull();
  });

  it("空文字の場合は null を返す", async () => {
    await expect(decrypt("")).resolves.toBeNull();
  });

  it("JWT 形式でない文字列の場合は null を返す", async () => {
    await expect(decrypt("not-a-jwt")).resolves.toBeNull();
  });

  it("ペイロードを改ざんしたトークンは null を返す", async () => {
    const token = await encrypt({ userId: "1" });
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ userId: "999" })).toString("base64url");

    await expect(decrypt(`${header}.${forgedPayload}.${signature}`)).resolves.toBeNull();
  });

  it("異なる秘密鍵で署名されたトークンは null を返す", async () => {
    const token = await new SignJWT({ userId: "1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("another-secret"));

    await expect(decrypt(token)).resolves.toBeNull();
  });

  it("HS256 以外のアルゴリズムで署名されたトークンは同じ鍵でも null を返す", async () => {
    const token = await new SignJWT({ userId: "1" })
      .setProtectedHeader({ alg: "HS512" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("secret"));

    await expect(decrypt(token)).resolves.toBeNull();
  });

  it("有効期限の 1 秒前までは検証に成功する", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    vi.setSystemTime(issuedAt);
    const token = await encrypt({ userId: "1" });

    vi.setSystemTime(issuedAt.getTime() + (SEVEN_DAYS_IN_SECONDS - 1) * 1000);

    await expect(decrypt(token)).resolves.toMatchObject({ userId: "1" });
  });

  it("有効期限ちょうどを過ぎたトークンは null を返す", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    vi.setSystemTime(issuedAt);
    const token = await encrypt({ userId: "1" });

    vi.setSystemTime(issuedAt.getTime() + SEVEN_DAYS_IN_SECONDS * 1000);

    await expect(decrypt(token)).resolves.toBeNull();
  });
});
