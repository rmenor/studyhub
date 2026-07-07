import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

// DELETE revokes a key. We don't actually delete the row so an audit trail
// stays in place; instead we set revokedAt and ignore it on subsequent auth.
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return new NextResponse(null, { status: 204 });
}