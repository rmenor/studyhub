import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar, type SidebarFolder, type SidebarTag } from "@/components/sidebar";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Prisma } from "@prisma/client";

// Explicit select types so Vercel's stricter tsc + Prisma version can infer
// the row shape reliably (the inferred return of findMany with nested
// filtered _count is fragile across Prisma patch versions).
const folderSelect = {
  id: true,
  name: true,
  parentId: true,
  _count: { select: { notes: { where: { archived: false } }, children: true } },
} satisfies Prisma.FolderSelect;

const tagSelect = {
  id: true,
  name: true,
  _count: { select: { notes: { where: { note: { archived: false } } } } },
} satisfies Prisma.TagSelect;

type FolderRow = Prisma.FolderGetPayload<{ select: typeof folderSelect }>;
type TagRow = Prisma.TagGetPayload<{ select: typeof tagSelect }>;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [folders, tags] = await Promise.all([
    prisma.folder.findMany({
      where: { userId: session.user.id },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: folderSelect,
    }) as Promise<FolderRow[]>,
    prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: tagSelect,
    }) as Promise<TagRow[]>,
  ]);

  const sidebarFolders: SidebarFolder[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    _count: { notes: f._count.notes, children: f._count.children },
  }));

  const sidebarTags: SidebarTag[] = tags.map((t) => ({
    id: t.id,
    name: t.name,
    noteCount: t._count.notes,
  }));

  return (
    <div className="flex h-screen flex-col bg-[var(--background)]">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex h-12 items-center gap-4 px-4">
          <nav className="ml-auto flex items-center gap-3 text-sm">
            <ThemeToggle />
            <span className="text-[var(--muted-foreground)] hidden sm:inline">
              {session.user.email}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--muted)]/30 overflow-hidden flex flex-col">
          <Suspense fallback={<div className="h-full" />}>
            <Sidebar folders={sidebarFolders} tags={sidebarTags} />
          </Suspense>
        </aside>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}