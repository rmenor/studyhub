import { prisma } from "@/lib/prisma";
import { extractBearer, hasScope, resolveApiKey } from "@/lib/api-keys";
import { externalNoteCreateSchema, externalNoteListQuerySchema } from "@/lib/validation/external";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// All `/api/external/*` endpoints authenticate with an API key (Authorization:
// Bearer shk_...). They never accept NextAuth cookies. This keeps the surface
// area for external callers minimal and the scope easy to reason about.

async function authenticate(req: Request) {
  const bearer = extractBearer(req.headers.get("authorization"));
  if (!bearer) return null;
  return await resolveApiKey(bearer);
}

async function findOrCreateFolder(userId: string, name?: string, folderId?: string | null) {
  if (folderId) {
    const f = await prisma.folder.findFirst({ where: { id: folderId, userId }, select: { id: true } });
    if (!f) throw new Error("Carpeta no encontrada");
    return f.id;
  }
  if (name) {
    const existing = await prisma.folder.findFirst({
      where: { userId, name },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.folder.create({
      data: { userId, name },
      select: { id: true },
    });
    return created.id;
  }
  return null;
}

export async function GET(req: Request) {
  const key = await authenticate(req);
  if (!key) return UNAUTHORIZED;
  if (!hasScope(key, "notes:read")) {
    return NextResponse.json({ error: "Scope requerido: notes:read" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = externalNoteListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }
  const { q, folderId, tag, limit } = parsed.data;

  const where: Prisma.NoteWhereInput = {
    userId: key.userId,
    archived: false,
    ...(folderId ? { folderId } : {}),
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folder: n.folder,
      tags: n.tags.map((t) => t.tag.name),
      pinned: n.pinned,
      archived: n.archived,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const key = await authenticate(req);
  if (!key) return UNAUTHORIZED;
  if (!hasScope(key, "notes:write")) {
    return NextResponse.json({ error: "Scope requerido: notes:write" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = externalNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { tagNames, folderId, folder, ...rest } = parsed.data;

  let resolvedFolderId: string | null = null;
  try {
    resolvedFolderId = await findOrCreateFolder(key.userId, folder, folderId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error con la carpeta";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tagConnects =
    tagNames && tagNames.length > 0
      ? await Promise.all(
          tagNames.map((name) =>
            prisma.tag.upsert({
              where: { userId_name: { userId: key.userId, name } },
              create: { userId: key.userId, name },
              update: {},
              select: { id: true },
            }),
          ),
        ).then((rows) => rows.map((r) => ({ id: r.id })))
      : [];

  const note = await prisma.note.create({
    data: {
      ...rest,
      userId: key.userId,
      folderId: resolvedFolderId,
      tags: { create: tagConnects.map((t) => ({ tagId: t.id })) },
    },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        folder: note.folder,
        tags: note.tags.map((t) => t.tag.name),
        pinned: note.pinned,
        archived: note.archived,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}