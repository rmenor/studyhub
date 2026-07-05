import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Providers } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyHub",
  description: "Tus notas de estudio, en la web y en el móvil.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur sticky top-0 z-10">
            <div className="mx-auto max-w-5xl flex items-center gap-4 px-6 py-3">
              <Link
                href="/"
                className="font-semibold text-lg tracking-tight flex items-center gap-2"
              >
                <span aria-hidden className="text-[var(--accent)]">●</span>
                StudyHub
              </Link>
              <nav className="ml-auto flex items-center gap-3 text-sm">
                {session?.user ? (
                  <>
                    <span className="text-[var(--muted-foreground)] hidden sm:inline">
                      {session.user.email}
                    </span>
                    <LogoutButton />
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
