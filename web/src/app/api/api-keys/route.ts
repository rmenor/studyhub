import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";
import { apiKeyCreateSchema } from "@/lib/validation/external";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes.split(",").map((s) => s.trim()).filter(Boolean),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
}

// POST creates a new key. The plaintext key is returned ONCE in the response —
// after that we only ever have the sha256 hash, so we can't show it again.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = apiKeyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { plaintext, record } = await createApiKey(session.user.id, parsed.data.name, parsed.data.scopes);

  return NextResponse.json(
    {
      key: {
        id: record.id,
        name: record.name,
        prefix: record.prefix,
        scopes: record.scopes.split(","),
        lastUsedAt: null,
        createdAt: record.createdAt.toISOString(),
      },
      plaintext, // shown only here
    },
    { status: 201 },
  );
}