// Next.js 16 renamed `middleware` to `proxy`. The proxy runtime is Node.js.
// NOTE: edge runtime is not supported here. If you ever need edge, keep using middleware.ts.
//
// Scope: protect **pages** only. /api/* routes authenticate themselves via
// `getSessionUser()` (which accepts cookies OR an `Authorization: Bearer` header),
// so they pass through untouched — otherwise the proxy would redirect mobile API
// calls (which never carry a cookie) to /login.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PAGE_PREFIXES = ["/login", "/_next", "/favicon"];

export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req;
  // Never protect /api/* — handlers validate themselves.
  if (nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  const isPublic = PUBLIC_PAGE_PREFIXES.some((p) =>
    nextUrl.pathname.startsWith(p),
  );
  if (isPublic) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  // Run on every path EXCEPT static assets and /api/*.
  // /api routes authenticate themselves via getSessionUser().
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
