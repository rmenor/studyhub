import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ApiKeysPanel, type ApiKey } from "@/components/api-keys-panel";

export const metadata = { title: "Claves de API · StudyHub" };

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Derive the public origin so the API docs in the panel show the real URL
  // (works the same on localhost, Vercel preview URLs, and the production
  // domain — they all send Host + x-forwarded-proto headers).
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const forwardedProto = h.get("x-forwarded-proto");
  const proto = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
  const apiBaseUrl = `${proto}://${host}`;

  const rows = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  const initialKeys: ApiKey[] = rows.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes.split(",").map((s) => s.trim()).filter(Boolean),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-2xl font-semibold mb-1">Claves de API</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Acceso programático para asistentes IA, scripts y otras integraciones externas.
      </p>
      <ApiKeysPanel initialKeys={initialKeys} apiBaseUrl={apiBaseUrl} />
    </div>
  );
}