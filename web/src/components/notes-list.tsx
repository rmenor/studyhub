"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type NoteTagVM = { tag: { id: string; name: string } };
export type NoteVM = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  folder: { id: string; name: string } | null;
  tags: NoteTagVM[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function snippet(content: string, max = 180) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export function NotesList({
  notes: initialNotes,
  defaultFolderId,
  defaultTagName,
}: {
  notes: NoteVM[];
  defaultFolderId?: string | null;
  defaultTagName?: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return notes;
    const q = query.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  async function onDelete(id: string) {
    if (!confirm("¿Borrar esta nota? Esto no se puede deshacer.")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    }
  }

  async function onTogglePin(id: string, current: boolean) {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !current }),
    });
    if (res.ok) {
      setNotes((prev) =>
        prev
          .map((n) => (n.id === id ? { ...n, pinned: !current } : n))
          .sort((a, b) =>
            Number(b.pinned) - Number(a.pinned) ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
      );
      router.refresh();
    }
  }

  if (notes.length === 0) {
    const isFiltered = Boolean(defaultFolderId || defaultTagName);
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center">
        <p className="text-[var(--muted-foreground)] mb-3">
          {isFiltered
            ? "No hay notas en esta vista."
            : "Aún no tienes notas. Empieza creando la primera."}
        </p>
        <Link
          href="/notes/new"
          className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Crear primera nota
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar en esta vista…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-[var(--muted-foreground)] py-8">
          Nada coincide con «{query}».
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((note) => (
            <li
              key={note.id}
              className="group rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors"
            >
              <Link
                href={`/notes/${note.id}`}
                className="block p-4 hover:bg-[var(--muted)]/40 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onTogglePin(note.id, note.pinned);
                    }}
                    className={`mt-1 text-xs ${note.pinned ? "text-[var(--accent)]" : "text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100"}`}
                    title={note.pinned ? "Desanclar" : "Anclar"}
                  >
                    ★
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h2 className="font-medium truncate">{note.title}</h2>
                      {note.folder && (
                        <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                          📁 {note.folder.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-2">
                      {snippet(note.content) || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {note.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]"
                        >
                          #{tag.name}
                        </span>
                      ))}
                      <span className="ml-auto text-[var(--muted-foreground)]">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="hidden group-hover:flex justify-end px-3 pb-2 -mt-1">
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  className="text-xs text-[var(--danger)] hover:underline"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}