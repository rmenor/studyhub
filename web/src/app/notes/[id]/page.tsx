import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NoteEditor } from "@/components/note-editor";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ id: string }>;

export default async function NotePage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const note = await prisma.note.findFirst({
    where: { id, userId: session.user.id },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  if (!note) notFound();

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        ← Volver al listado
      </Link>
      <NoteEditor
        folders={folders}
        initial={{
          id: note.id,
          title: note.title,
          content: note.content,
          folderId: note.folderId,
          pinned: note.pinned,
          tagNames: note.tags.map((t) => t.tag.name),
        }}
      />
    </div>
  );
}
