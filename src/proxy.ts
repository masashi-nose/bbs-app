import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./utils/jwt";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookie = request.cookies.get("session");
  const session = await decrypt(cookie?.value);

  const isAuthenticated = !!session?.userId;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
