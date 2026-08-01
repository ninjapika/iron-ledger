import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
  signSessionToken,
  sessionCookieMaxAgeSeconds,
} from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (!isPublic && !payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && payload) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();

  // Sliding expiration: every authenticated request pushes the expiry back
  // out, so an active user is only ever signed out after real inactivity —
  // matching "don't ask me to log in every day on this device."
  if (payload) {
    const refreshed = await signSessionToken(payload.sub);
    res.cookies.set(SESSION_COOKIE, refreshed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionCookieMaxAgeSeconds(),
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
