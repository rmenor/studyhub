"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Folder = { id: string; name: string };
type TagSuggestion = { id: string; name: string; noteCount: number };

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
  const [tags, setTags] = useState<string[]>((initial?.tagNames ?? []).filter(Boolean));
  const [tagDraft, setTagDraft] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tag suggestions once for the autocomplete dropdown.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((data: { tags: TagSuggestion[] }) => {
        if (!cancelled) setTagSuggestions(data.tags ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const availableSuggestions = tagSuggestions
    .filter((s) => !tags.includes(s.name))
    .filter((s) => (tagDraft ? s.name.toLowerCase().includes(tagDraft.toLowerCase()) : true))
    .slice(0, 8);

  function addTag(raw: string) {
    const name = raw.trim().replace(/^#/, "");
    if (!name) return;
    if (tags.includes(name)) return;
    if (name.length > 40) return;
    setTags((prev) => [...prev, name]);
    setTagDraft("");
  }

  function removeTag(name: string) {
    setTags((prev) => prev.filter((t) => t !== name));
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function save() {
    setError(null);
    if (tagDraft.trim()) addTag(tagDraft); // commit any pending chip

    const payload = {
      title: title.trim(),
      content,
      folderId,
      tagNames: tags,
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
    <div className="mx-auto max-w-3xl px-6 py-6">
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
        <div className="block">
          <span className="text-xs text-[var(--muted-foreground)]">Etiquetas</span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--muted)] text-xs"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                  aria-label={`Quitar ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={() => tagDraft.trim() && addTag(tagDraft)}
              placeholder={tags.length === 0 ? "Añadir etiqueta…" : ""}
              className="flex-1 min-w-[8rem] bg-transparent text-sm focus:outline-none px-1"
            />
          </div>
          {availableSuggestions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {availableSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(s.name)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                >
                  #{s.name} <span className="opacity-60">({s.noteCount})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe tu nota…"
        rows={20}
        className="w-full px-4 py-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-mono"
      />

      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}