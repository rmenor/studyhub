"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
    >
      Cerrar sesión
    </button>
  );
}
