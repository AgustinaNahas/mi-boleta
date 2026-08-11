import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mi-boleta",
  description:
    "Elegí la lista que votaste y mirá cómo votaron en el Congreso quienes entraron.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-ink">
        <header className="z-40">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
            <Link href="/" className="inline-flex items-center" aria-label="Inicio">
              <BrandMark className="h-7 w-10" />
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/metodologia/"
                className="text-sm font-medium text-ink transition hover:opacity-60"
              >
                Metodología
              </Link>
              <Link
                href="/#buscar-proyecto"
                className="text-sm font-medium text-ink transition hover:opacity-60"
              >
                Buscar por proyecto
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 sm:px-8">
          {children}
        </main>
        <footer className="bg-ink text-white">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 text-xs leading-relaxed text-white/80 sm:grid-cols-2 sm:px-8">
            <p>
              mi-boleta es un proyecto independiente y sin fines de lucro de
              Agustina Nahas y Azul Damadian. No tiene afiliación oficial con
              la Cámara de Diputados de la Nación ni con ningún partido
              político.
            </p>
            <p>
              Fuentes: datos públicos de congreso.gob.ar y
              votaciones.hcdn.gob.ar. La información se presenta “tal cual”;
              verificá siempre en el acta oficial.{" "}
              <Link
                href="/metodologia/"
                className="underline underline-offset-2 hover:text-white"
              >
                Metodología
              </Link>
              {" · "}
              <a
                href="https://votaciones.hcdn.gob.ar"
                className="underline underline-offset-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Verificar datos
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
