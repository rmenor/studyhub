"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeysPanel({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [revealed, setRevealed] = useState<{ id: string; plaintext: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await fetch("/api/api-keys", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { keys: ApiKey[] };
      setKeys(data.keys);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando las claves");
    }
  }

  async function createKey() {
    if (!newName.trim()) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), scopes: ["notes:write", "notes:read"] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { key: ApiKey; plaintext: string };
      setRevealed({ id: data.key.id, plaintext: data.plaintext });
      setNewName("");
      await reload();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando la clave");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string, name: string) {
    if (!confirm(`¿Revocar la clave "${name}"? Dejará de funcionar inmediatamente.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error revocando");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--border)] p-5">
        <h2 className="text-lg font-semibold mb-1">Crear nueva clave</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Las claves dan acceso a una IA externa o script para leer y escribir tus notas.
          Se muestran <strong>solo una vez</strong> al crearlas — guárdala en tu gestor de secretos.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createKey()}
            placeholder='Nombre (ej. "Asistente ChatGPT")'
            maxLength={60}
            className="flex-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={createKey}
            disabled={creating || !newName.trim()}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {creating ? "Creando…" : "Crear clave"}
          </button>
        </div>
        {revealed && (
          <div className="mt-4 rounded-md border border-[var(--accent)] bg-[var(--accent)]/5 p-3">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">
              Copia esta clave ahora — no podrás verla de nuevo.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1.5 rounded bg-[var(--background)] border border-[var(--border)] text-xs font-mono break-all">
                {revealed.plaintext}
              </code>
              <button
                type="button"
                onClick={() => copy(revealed.plaintext)}
                className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] text-xs"
              >
                Copiar
              </button>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="px-3 py-1.5 rounded-md text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Hecho
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Claves activas</h2>
        {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}
        {keys.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Aún no has creado ninguna clave.
          </p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="rounded-lg border border-[var(--border)] p-4 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[12rem]">
                  <div className="font-medium">{k.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] font-mono">
                    {k.prefix}…
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1 flex flex-wrap gap-2">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] text-right">
                  <div>Creada {new Date(k.createdAt).toLocaleDateString("es-ES")}</div>
                  <div>
                    {k.lastUsedAt
                      ? `Usada ${new Date(k.lastUsedAt).toLocaleString("es-ES")}`
                      : "Nunca usada"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(k.id, k.name)}
                  disabled={busyId === k.id}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--muted)] disabled:opacity-60"
                >
                  {busyId === k.id ? "Revocando…" : "Revocar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] p-5 bg-[var(--muted)]/30">
        <h2 className="text-base font-semibold mb-2">Cómo usarla</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-2">
          Envía la clave en el header <code className="px-1 py-0.5 rounded bg-[var(--background)] text-xs">Authorization</code>:
        </p>
        <pre className="text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded p-3 overflow-x-auto whitespace-pre">
{`curl -X POST https://studyhub.example/api/external/notes \\
  -H "Authorization: Bearer shk_xxxxxxxx..." \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Resumen reunión","content":"# Temas\\n- ...","tagNames":["reunion"]}'`}
        </pre>
        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          Endpoints disponibles: <code>GET/POST /api/external/notes</code>,{" "}
          <code>GET/PATCH/DELETE /api/external/notes/[id]</code>. Scopes:{" "}
          <code>notes:read</code> y <code>notes:write</code>.
        </p>
      </section>
    </div>
  );
}