"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NoteEditor } from "@/components/note-editor";
import { Markdown } from "@/components/markdown";

type FolderLite = { id: string; name: string };
type NoteData = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  folder: FolderLite | null;
  tags: { tag: { id: string; name: string } }[];
};

type Props = {
  note: NoteData;
  folders: FolderLite[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteView({ note, folders }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pinned, setPinned] = useState(note.pinned);
  const [tags] = useState(note.tags.map((t) => t.tag));

  async function togglePin() {
    const next = !pinned;
    setPinned(next);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: next }),
    });
    if (!res.ok) setPinned(!next);
  }

  async function deleteNote() {
    if (!confirm(`¿Borrar la nota "${note.title}"? Esto no se puede deshacer.`)) return;
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  }

  if (editing) {
    return (
      <NoteEditor
        folders={folders}
        initial={{
          id: note.id,
          title: note.title,
          content: note.content,
          folderId: note.folderId,
          pinned: note.pinned,
          tagNames: tags.map((t) => t.name),
        }}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          ← Volver
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePin}
            className={`text-sm w-8 h-8 inline-flex items-center justify-center rounded-md border border-[var(--border)] ${
              pinned
                ? "text-[var(--accent)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            } hover:bg-[var(--muted)]`}
            aria-label={pinned ? "Desanclar" : "Anclar"}
            title={pinned ? "Desanclar" : "Anclar"}
          >
            ★
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={deleteNote}
            className="text-sm w-8 h-8 inline-flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--muted)]"
            aria-label="Borrar nota"
            title="Borrar"
          >
            🗑
          </button>
        </div>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        {note.title || "(sin título)"}
      </h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)] mb-6">
        <span>{formatDate(note.updatedAt)}</span>
        {note.folder && (
          <>
            <span>·</span>
            <Link
              href={`/?folder=${note.folder.id}`}
              className="hover:text-[var(--foreground)]"
            >
              📁 {note.folder.name}
            </Link>
          </>
        )}
        {tags.length > 0 && (
          <>
            <span>·</span>
            <span className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/?tag=${encodeURIComponent(t.name)}`}
                  className="hover:text-[var(--foreground)]"
                >
                  #{t.name}
                </Link>
              ))}
            </span>
          </>
        )}
      </div>

      <article>
        <Markdown>{note.content}</Markdown>
      </article>
    </div>
  );
}