"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/";
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "No se pudo crear la cuenta");
        return;
      }
    }

    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email o contraseña incorrectos");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex gap-1 mb-6 rounded-lg bg-[var(--muted)] p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === m
                ? "bg-[var(--background)] shadow-sm font-medium"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {m === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="text-sm text-[var(--muted-foreground)]">Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm text-[var(--muted-foreground)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[var(--muted-foreground)]">Contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {mode === "signup" && (
            <span className="text-xs text-[var(--muted-foreground)]">Mínimo 8 caracteres</span>
          )}
        </label>

        {error && (
          <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-2 rounded-md font-medium transition-colors"
        >
          {pending ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
