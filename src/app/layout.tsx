import type { Metadata } from "next";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { EscarapelaMark } from "@/components/escarapela-mark";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mi-boleta",
  description:
    "Elegí la lista que votaste y mirá cómo votaron en el Congreso quienes entraron.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-ink">
        <ThemeProvider>
          <div className="triband" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <header className="sticky top-0 z-40 border-b border-line bg-[var(--header-bg)]/95 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                <EscarapelaMark className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
                <Link
                  href="/"
                  className="font-display text-xl font-bold uppercase tracking-wide text-navy dark:text-white"
                >
                  mi-boleta
                </Link>
                <Link
                  href="/elegir/"
                  className="truncate text-sm font-semibold text-ink-muted transition hover:text-celeste-deep dark:hover:text-celeste"
                >
                  Elegí tu lista
                </Link>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-5 sm:py-12">
            {children}
          </main>
          <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">
            Datos públicos · sin score ideológico · onda gráfica Bicentenario
            2010
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
