import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string;
  email: string;
  name?: string | null;
};

export async function signSession(
  payload: SessionPayload,
  ttlSeconds = 60 * 60 * 24 * 30, // 30 days
) {
  return await new SignJWT({ email: payload.email, name: payload.name ?? null })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}
