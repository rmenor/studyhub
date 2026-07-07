import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { folderCreateSchema } from "@/lib/validation/folders";
import { NextResponse } from "next/server";

// GET /api/folders — returns the full tree for the current user.
// Each folder includes its note count (non-archived) and child count.
export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { notes: { where: { archived: false } }, children: true } },
    },
  });

  return NextResponse.json({ folders });
}

// POST /api/folders — create a folder. `parentId` optional (null = root).
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = folderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Reject parentId that doesn't belong to this user.
  if (parsed.data.parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: parsed.data.parentId, userId: user.id },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Carpeta padre no encontrada" }, { status: 400 });
    }
  }

  const folder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      parentId: parsed.data.parentId ?? null,
    },
    select: { id: true, name: true, parentId: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ folder }, { status: 201 });
}