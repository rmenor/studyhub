import { NoteEditor } from "@/components/note-editor";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = { title: "Nueva nota · StudyHub" };

export default async function NewNotePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NoteEditor folders={folders} />;
}