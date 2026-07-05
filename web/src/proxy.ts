// Next.js 16 renamed `middleware` to `proxy`. The proxy runtime is Node.js.
// NOTE: edge runtime is not supported here. If you ever need edge, keep using middleware.ts.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/register", "/_next", "/favicon"];

export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req;
  const isPublic = PUBLIC_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));
  if (isPublic) return NextResponse.next();
  if (!session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  // Run on every path except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
