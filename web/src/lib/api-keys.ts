import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ApiKey } from "@prisma/client";

export const API_KEY_PREFIX = "shk_";

export type ResolvedApiKey = {
  id: string;
  userId: string;
  name: string;
  scopes: string[];
};

/** Generate a new API key. Returns the plaintext (shown ONCE) and the DB row. */
export async function createApiKey(userId: string, name: string, scopes: string[]): Promise<{
  plaintext: string;
  record: ApiKey;
}> {
  // 32 bytes → ~43 chars of base64url, prefixed so users can identify it.
  const random = randomBytes(32).toString("base64url");
  const plaintext = `${API_KEY_PREFIX}${random}`;
  const keyHash = sha256Hex(plaintext);
  const prefix = plaintext.slice(0, 12); // "shk_" + first 8 of the random part

  const record = await prisma.apiKey.create({
    data: {
      userId,
      name: name.trim(),
      keyHash,
      prefix,
      scopes: scopes.join(","),
    },
  });
  return { plaintext, record };
}

/** Validate an incoming API key. Returns the resolved key or null. */
export async function resolveApiKey(raw: string): Promise<ResolvedApiKey | null> {
  if (!raw.startsWith(API_KEY_PREFIX)) return null;
  const keyHash = sha256Hex(raw);
  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true, name: true, scopes: true, revokedAt: true },
  });
  if (!record || record.revokedAt) return null;
  // Best-effort update of lastUsedAt. Don't block the request if it fails.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    scopes: record.scopes.split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export function hasScope(key: ResolvedApiKey, scope: string): boolean {
  return key.scopes.includes(scope) || key.scopes.includes("*");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Extract the bearer token from an Authorization header (case-insensitive). */
export function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}