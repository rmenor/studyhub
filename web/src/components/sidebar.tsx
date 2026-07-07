"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export type SidebarFolder = {
  id: string;
  name: string;
  parentId: string | null;
  _count: { notes: number; children: number };
};

export type SidebarTag = {
  id: string;
  name: string;
  noteCount: number;
};

type Props = {
  folders: SidebarFolder[];
  tags: SidebarTag[];
};

type FolderNode = SidebarFolder & { children: FolderNode[] };

function buildTree(folders: SidebarFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  for (const f of folders) map.set(f.id, { ...f, children: [] });
  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function buildHref(params: { folder?: string | null; tag?: string | null }): string {
  const sp = new URLSearchParams();
  if (params.folder) sp.set("folder", params.folder);
  if (params.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export function Sidebar({ folders, tags }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFolder = searchParams.get("folder");
  const activeTag = searchParams.get("tag");
  const view = searchParams.get("view");

  const tree = useMemo(() => buildTree(folders), [folders]);
  const [, startTransition] = useTransition();

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (activeFolder) {
      set.add(activeFolder);
      let cur = folders.find((f) => f.id === activeFolder)?.parentId;
      while (cur) {
        set.add(cur);
        cur = folders.find((f) => f.id === cur)?.parentId;
      }
    } else {
      // Default: expand all root folders one level so the user sees structure.
      for (const f of folders) {
        if (!f.parentId) set.add(f.id);
      }
    }
    return set;
  });

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  async function createFolder(parentId: string | null = null) {
    const name = window.prompt("Nombre de la carpeta");
    if (!name?.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId }),
    });
    if (res.ok) {
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Error creando carpeta");
    }
  }

  async function deleteFolder(id: string, name: string) {
    if (!confirm(`¿Borrar la carpeta "${name}"? Las notas que contiene quedarán sin carpeta.`)) return;
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (activeFolder === id) router.push("/");
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Error borrando carpeta");
    }
  }

  async function renameFolder(id: string, currentName: string) {
    const name = window.prompt("Nuevo nombre", currentName);
    if (!name?.trim() || name.trim() === currentName) return;
    const res = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) refresh();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Error renombrando");
    }
  }

  const totalDirect = folders.reduce((acc, f) => acc + f._count.notes, 0);
  const totalTags = tags.reduce((acc, t) => acc + t.noteCount, 0);

  const isTagActive = (name: string) => activeTag === name;
  const isViewActive = (v: string | null) => (view ?? "all") === v;

  return (
    <div className="flex h-full flex-col text-sm">
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <Section title="Vistas">
          <SidebarLink
            href={buildHref({ folder: null, tag: null })}
            label="Todas las notas"
            active={!activeFolder && !activeTag && isViewActive("all")}
          />
          <SidebarLink
            href={buildHref({ folder: null, tag: null }) + (view === "pinned" ? "" : "?view=pinned")}
            label="📌  Ancladas"
            active={isViewActive("pinned")}
          />
        </Section>

        <Section
          title="Carpetas"
          action={
            <button
              type="button"
              onClick={() => createFolder(null)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] w-5 h-5 inline-flex items-center justify-center rounded hover:bg-[var(--muted)]"
              title="Nueva carpeta raíz"
              aria-label="Nueva carpeta raíz"
            >
              ＋
            </button>
          }
        >
          {tree.length === 0 ? (
            <p className="px-2 py-1 text-xs text-[var(--muted-foreground)] italic">
              Sin carpetas. Pulsa ＋ para crear una.
            </p>
          ) : (
            tree.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                activeId={activeFolder}
                onAddChild={createFolder}
                onRename={renameFolder}
                onDelete={deleteFolder}
              />
            ))
          )}
        </Section>

        <Section title="Etiquetas">
          {tags.length === 0 ? (
            <p className="px-2 py-1 text-xs text-[var(--muted-foreground)] italic">
              Sin etiquetas. Añade alguna al editar una nota.
            </p>
          ) : (
            tags.map((t) => {
              const active = isTagActive(t.name);
              return (
                <Link
                  key={t.id}
                  href={buildHref({ tag: t.name })}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                    active
                      ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
                      : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}
                >
                  <span className="truncate">#{t.name}</span>
                  <span className="ml-2 text-[10px] opacity-60">{t.noteCount}</span>
                </Link>
              );
            })
          )}
        </Section>
      </nav>

      <div className="shrink-0 border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted-foreground)] flex justify-between">
        <span>{totalDirect} en carpetas</span>
        <span>{totalTags} con etiquetas</span>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
          {title}
        </span>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SidebarLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center px-2 py-1 rounded text-xs ${
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
          : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
      }`}
    >
      {label}
    </Link>
  );
}

function FolderTreeItem({
  node,
  depth,
  expanded,
  onToggle,
  activeId,
  onAddChild,
  onRename,
  onDelete,
}: {
  node: FolderNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  activeId: string | null;
  onAddChild: (parentId: string) => Promise<void>;
  onRename: (id: string, currentName: string) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const active = activeId === node.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-0.5 pr-1 rounded text-xs ${
          active
            ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
            : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
        }`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="w-4 text-center opacity-70 hover:opacity-100"
            aria-label={isOpen ? "Colapsar" : "Expandir"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Link
          href={`/?folder=${node.id}`}
          className="flex-1 flex items-center justify-between gap-2 truncate py-1"
          title={node.name}
        >
          <span className="truncate flex items-center gap-1.5">
            <span aria-hidden className="opacity-70">📁</span>
            {node.name}
          </span>
          {node._count.notes > 0 && (
            <span className="text-[10px] opacity-60 shrink-0">{node._count.notes}</span>
          )}
        </Link>
        <span className="opacity-0 group-hover:opacity-100 flex items-center text-[10px]">
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="w-4 h-4 inline-flex items-center justify-center rounded hover:bg-[var(--muted)] hover:text-[var(--accent)]"
            title="Nueva subcarpeta"
            aria-label="Nueva subcarpeta"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => onRename(node.id, node.name)}
            className="w-4 h-4 inline-flex items-center justify-center rounded hover:bg-[var(--muted)] hover:text-[var(--accent)]"
            title="Renombrar"
            aria-label="Renombrar"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id, node.name)}
            className="w-4 h-4 inline-flex items-center justify-center rounded hover:bg-[var(--muted)] hover:text-[var(--danger)]"
            title="Borrar"
            aria-label="Borrar"
          >
            ×
          </button>
        </span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              activeId={activeId}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}