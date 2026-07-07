import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyHub",
  description: "Tus notas de estudio, en la web y en el móvil.",
};

// Runs before any React hydration: reads the saved preference (or the OS
// default), and applies `.dark` on <html> so we don't get a flash of the
// wrong theme. Kept as a plain inline script (not a React component child)
// so React doesn't try to "re-render" it on the client.
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('studyhub.theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}