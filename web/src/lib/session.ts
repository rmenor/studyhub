import { auth } from "@/lib/auth";
import { verifySession } from "@/lib/jwt";
import type { Session } from "next-auth";

/**
 * Unified session resolver.
 *  - On the web: returns the NextAuth session (cookie-based).
 *  - On the mobile API: accepts `Authorization: Bearer <jwt>` and returns
 *    a minimal session-like object with the same shape used inside routes.
 */
export type ResolvedUser = { id: string; email: string; name?: string | null };

export async function getSessionUser(req: Request): Promise<ResolvedUser | null> {
  // 1) Bearer token (mobile)
  const authz = req.headers.get("authorization");
  if (authz?.toLowerCase().startsWith("bearer ")) {
    const token = authz.slice(7).trim();
    const payload = await verifySession(token);
    if (payload) {
      return { id: payload.sub, email: payload.email, name: payload.name };
    }
  }

  // 2) NextAuth cookie session (web)
  const session: Session | null = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? null,
    };
  }
  return null;
}
