import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { folderUpdateSchema } from "@/lib/validation/folders";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/folders/[id] — rename or move (parentId).
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = folderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.folder.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
    // Prevent cycles: new parent must not be a descendant of this folder.
    if (parsed.data.parentId === id) {
      return NextResponse.json({ error: "Una carpeta no puede ser su propia padre" }, { status: 400 });
    }
    const parent = await prisma.folder.findFirst({
      where: { id: parsed.data.parentId, userId: user.id },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Carpeta padre no encontrada" }, { status: 400 });
    }
    // Walk descendants of `id`; reject if parentId is among them.
    const stack = [id];
    const descendants = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      const children = await prisma.folder.findMany({
        where: { parentId: cur, userId: user.id },
        select: { id: true },
      });
      for (const c of children) {
        if (!descendants.has(c.id)) {
          descendants.add(c.id);
          stack.push(c.id);
        }
      }
    }
    if (descendants.has(parsed.data.parentId)) {
      return NextResponse.json({ error: "Movimiento crearía un ciclo" }, { status: 400 });
    }
  }

  const folder = await prisma.folder.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.parentId !== undefined ? { parentId: parsed.data.parentId } : {}),
    },
    select: { id: true, name: true, parentId: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ folder });
}

// DELETE /api/folders/[id] — delete the folder; notes in it become uncategorised
// (folderId is set to NULL via the schema's onDelete: SetNull).
export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.folder.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade in the schema already handles children folders + sets note folderId to NULL.
  await prisma.folder.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}