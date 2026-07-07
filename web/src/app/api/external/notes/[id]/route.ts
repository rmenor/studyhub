import { prisma } from "@/lib/prisma";
import { extractBearer, hasScope, resolveApiKey } from "@/lib/api-keys";
import { externalNoteUpdateSchema } from "@/lib/validation/external";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };
const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

async function authenticate(req: Request) {
  const bearer = extractBearer(req.headers.get("authorization"));
  if (!bearer) return null;
  return await resolveApiKey(bearer);
}

export async function GET(req: Request, ctx: Ctx) {
  const key = await authenticate(req);
  if (!key) return UNAUTHORIZED;
  if (!hasScope(key, "notes:read")) {
    return NextResponse.json({ error: "Scope requerido: notes:read" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const note = await prisma.note.findFirst({
    where: { id, userId: key.userId },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
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
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const key = await authenticate(req);
  if (!key) return UNAUTHORIZED;
  if (!hasScope(key, "notes:write")) {
    return NextResponse.json({ error: "Scope requerido: notes:write" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = externalNoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.note.findFirst({
    where: { id, userId: key.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tagNames, folderId, folder, ...rest } = parsed.data;
  let resolvedFolderId: string | null | undefined = undefined;
  if (folderId !== undefined) resolvedFolderId = folderId ?? null;
  else if (folder !== undefined) {
    if (folder === null || folder === "") {
      resolvedFolderId = null;
    } else {
      const existing = await prisma.folder.findFirst({
        where: { userId: key.userId, name: folder },
        select: { id: true },
      });
      if (existing) {
        resolvedFolderId = existing.id;
      } else {
        const created = await prisma.folder.create({
          data: { userId: key.userId, name: folder },
          select: { id: true },
        });
        resolvedFolderId = created.id;
      }
    }
  }

  const tagsUpdate =
    tagNames !== undefined
      ? {
          deleteMany: {},
          create: await Promise.all(
            tagNames.map((name) =>
              prisma.tag.upsert({
                where: { userId_name: { userId: key.userId, name } },
                create: { userId: key.userId, name },
                update: {},
                select: { id: true },
              }),
            ),
          ).then((rows) => rows.map((r) => ({ tagId: r.id }))),
        }
      : undefined;

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...rest,
      ...(resolvedFolderId !== undefined ? { folderId: resolvedFolderId } : {}),
      ...(tagsUpdate ? { tags: tagsUpdate } : {}),
    },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
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
  });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const key = await authenticate(req);
  if (!key) return UNAUTHORIZED;
  if (!hasScope(key, "notes:write")) {
    return NextResponse.json({ error: "Scope requerido: notes:write" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.note.findFirst({
    where: { id, userId: key.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}