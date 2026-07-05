import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotesList } from "@/components/notes-list";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "StudyHub" };

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id, archived: false },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 100,
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Mis notas</h1>
        <Link
          href="/notes/new"
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          + Nueva nota
        </Link>
      </div>
      <NotesList
        notes={notes.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        }))}
        folders={folders}
      />
    </div>
  );
}
