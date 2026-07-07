import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotesList, type NoteVM } from "@/components/notes-list";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "StudyHub" };

type SP = Promise<{ folder?: string; tag?: string; view?: string }>;

function deriveHeaderLabel(
  folderName?: string | null,
  tagName?: string | null,
  view?: string,
) {
  if (view === "pinned") return "Ancladas";
  if (folderName) return folderName;
  if (tagName) return `#${tagName}`;
  return "Todas las notas";
}

async function collectDescendantFolderIds(
  rootId: string,
  userId: string,
): Promise<string[]> {
  // BFS over the parent->children graph, scoped to this user.
  const result: string[] = [rootId];
  let frontier = [rootId];
  const seen = new Set<string>([rootId]);
  while (frontier.length > 0) {
    const children = await prisma.folder.findMany({
      where: { parentId: { in: frontier }, userId },
      select: { id: true },
    });
    const nextFrontier: string[] = [];
    for (const c of children) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        nextFrontier.push(c.id);
        result.push(c.id);
      }
    }
    frontier = nextFrontier;
    if (nextFrontier.length === 0) break;
  }
  return result;
}

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const folderId = sp.folder;
  const tagName = sp.tag;
  const view = sp.view;

  let activeFolderName: string | null = null;
  let folderFilterIds: string[] | null = null;

  if (folderId) {
    const f = await prisma.folder.findFirst({
      where: { id: folderId, userId: session.user.id },
      select: { id: true, name: true },
    });
    if (!f) {
      return (
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-[var(--muted-foreground)]">Carpeta no encontrada.</p>
        </div>
      );
    }
    activeFolderName = f.name;
    folderFilterIds = await collectDescendantFolderIds(f.id, session.user.id);
  }

  const where: Prisma.NoteWhereInput = {
    userId: session.user.id,
    archived: false,
    ...(folderFilterIds ? { folderId: { in: folderFilterIds } } : {}),
    ...(tagName ? { tags: { some: { tag: { name: tagName } } } } : {}),
    ...(view === "pinned" ? { pinned: true } : {}),
  };

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  const headerLabel = deriveHeaderLabel(activeFolderName, tagName ?? null, view);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{headerLabel}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {notes.length} {notes.length === 1 ? "nota" : "notas"}
          </p>
        </div>
        <Link
          href="/notes/new"
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          + Nueva nota
        </Link>
      </div>
      <NotesList
        key={`${folderId ?? ""}|${tagName ?? ""}|${view ?? ""}`}
        notes={notes.map<NoteVM>((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          pinned: n.pinned,
          archived: n.archived,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
          folder: n.folder,
          tags: n.tags,
        }))}
        defaultFolderId={folderId ?? null}
        defaultTagName={tagName ?? null}
      />
    </div>
  );
}