import { NoteEditor } from "@/components/note-editor";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Editar nota · StudyHub" };

type Params = Promise<{ id: string }>;

export default async function NotePage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const [note, folders] = await Promise.all([
    prisma.note.findFirst({
      where: { id, userId: session.user.id },
      include: {
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
      },
    }),
    prisma.folder.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!note) notFound();

  return (
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
  );
}