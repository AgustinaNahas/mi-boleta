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
          <div className="shell cols items-center py-5">
            <Link
              href="/"
              className="col-span-2 inline-flex items-center sm:col-span-3 lg:col-span-4"
              aria-label="Inicio"
            >
              <BrandMark className="h-7 w-10" />
            </Link>
            <div className="col-span-2 flex items-center justify-end gap-4 sm:col-span-5 sm:gap-6 lg:col-span-12">
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
        <main className="shell flex-1 pb-16">{children}</main>
        <footer className="bg-ink text-white">
          <div className="shell cols gap-y-8 py-10 text-xs leading-relaxed text-white/80">
            <p className="col-span-4 sm:col-span-4 lg:col-span-8">
              mi-boleta es un proyecto independiente y sin fines de lucro de
              Agustina Nahas y Azul Damadian. No tiene afiliación oficial con
              la Cámara de Diputados de la Nación ni con ningún partido
              político.
            </p>
            <p className="col-span-4 sm:col-span-4 lg:col-span-8">
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
