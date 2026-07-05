"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Folder = { id: string; name: string };

export function NoteEditor({
  initial,
  folders,
}: {
  initial?: {
    id?: string;
    title?: string;
    content?: string;
    folderId?: string | null;
    pinned?: boolean;
    tagNames?: string[];
  };
  folders: Folder[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [folderId, setFolderId] = useState<string | null>(initial?.folderId ?? null);
  const [tagsInput, setTagsInput] = useState((initial?.tagNames ?? []).join(", "));
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const tagNames = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      content,
      folderId,
      tagNames,
      pinned,
    };

    let res: Response;
    if (initial?.id) {
      res = await fetch(`/api/notes/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Error guardando");
      return;
    }

    const data = await res.json();
    startTransition(() => {
      router.replace(`/notes/${data.note.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Anclada
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending || !title.trim()}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Título de la nota"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-2xl font-semibold bg-transparent border-0 px-0 py-1 focus:outline-none focus:ring-0 mb-4"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="text-xs text-[var(--muted-foreground)]">Carpeta</span>
          <select
            value={folderId ?? ""}
            onChange={(e) => setFolderId(e.target.value || null)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">— Sin carpeta —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted-foreground)]">Etiquetas (separadas por coma)</span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ej: mates, parcial-1"
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </label>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe tu nota…"
        rows={20}
        className="w-full px-4 py-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-mono"
      />

      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}
