import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { noteUpdateSchema } from "@/lib/validation/notes";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = noteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.note.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tagNames, folderId, ...rest } = parsed.data;

  const tagsUpdate =
    tagNames !== undefined
      ? {
          deleteMany: {},
          create: await Promise.all(
            tagNames.map((name) =>
              prisma.tag.upsert({
                where: { userId_name: { userId: user.id, name } },
                create: { userId: user.id, name },
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
      ...(folderId !== undefined ? { folderId: folderId ?? null } : {}),
      ...(tagsUpdate ? { tags: tagsUpdate } : {}),
    },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ note });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.note.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
