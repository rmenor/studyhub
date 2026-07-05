import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { noteCreateSchema } from "@/lib/validation/notes";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const folderId = url.searchParams.get("folderId");
  const tagName = url.searchParams.get("tag");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const where: Prisma.NoteWhereInput = {
    userId: user.id,
    archived: false,
    ...(folderId ? { folderId } : {}),
    ...(tagName
      ? { tags: { some: { tag: { name: tagName } } } }
      : {}),
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

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = noteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { tagNames, folderId, ...rest } = parsed.data;

  const tagConnects =
    tagNames && tagNames.length > 0
      ? await Promise.all(
          tagNames.map((name) =>
            prisma.tag.upsert({
              where: { userId_name: { userId: user.id, name } },
              create: { userId: user.id, name },
              update: {},
              select: { id: true },
            }),
          ),
        ).then((rows) => rows.map((r) => ({ id: r.id })))
      : [];

  const note = await prisma.note.create({
    data: {
      ...rest,
      userId: user.id,
      folderId: folderId ?? null,
      tags: { create: tagConnects.map((t) => ({ tagId: t.id })) },
    },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
