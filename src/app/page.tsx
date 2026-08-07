import Link from "next/link";
import { EscarapelaMark } from "@/components/escarapela-mark";
import { FeaturedVotesExplorer } from "@/components/featured-votes-explorer";
import { getFeaturedLaws, getFeaturedVotes } from "@/lib/data";

export default function HomePage() {
  const featuredLaws = getFeaturedLaws();
  const featuredVotes = getFeaturedVotes();

  return (
    <div className="space-y-12 sm:space-y-14">
      <section className="flex items-center gap-6 border border-line bg-paper-elevated px-5 py-9 sm:gap-8 sm:px-8 sm:py-12">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center gap-3 sm:hidden">
            <EscarapelaMark className="h-14 w-14 shrink-0" />
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-celeste-deep dark:text-celeste">
              Argentina · Diputados
            </p>
          </div>
          <p className="rise hidden text-[0.7rem] font-bold uppercase tracking-[0.2em] text-celeste-deep sm:block dark:text-celeste">
            Argentina · Diputados nacionales
          </p>
          <h1 className="rise rise-delay-1 font-display text-5xl font-bold uppercase leading-[0.92] tracking-wide text-navy sm:text-6xl dark:text-white">
            mi-boleta
          </h1>
          <p className="rise rise-delay-2 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
            Elegí la lista que votaste y mirá quiénes entraron — y cómo votaron
            las leyes que importan.
          </p>
          <div className="rise rise-delay-3 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Link href="/elegir/" className="btn-patria w-full sm:w-auto">
              Elegí tu lista
            </Link>
            <p className="text-xs leading-relaxed text-ink-muted sm:max-w-xs">
              Piloto CABA y Buenos Aires · 2023 y 2025 · sin rankings morales
            </p>
          </div>
        </div>

        <EscarapelaMark
          className="hidden h-36 w-36 shrink-0 sm:block lg:h-44 lg:w-44"
          aria-hidden
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">
          Cómo va a andar
        </h2>
        <ol className="grid border border-line sm:grid-cols-2">
          {[
            "Elegís distrito y elección.",
            "Elegís la alianza / boleta.",
            "Ves quiénes entraron de esa lista.",
            "Ves cómo votó cada uno en las leyes destacadas.",
          ].map((step, i) => (
            <li
              key={step}
              className={`flex gap-3 bg-paper-elevated px-4 py-3.5 text-sm leading-relaxed text-ink-muted ${
                i < 3 ? "border-b border-line" : ""
              } ${i % 2 === 0 ? "sm:border-r sm:border-line" : ""} ${
                i >= 2 ? "sm:border-b-0" : ""
              }`}
            >
              <span className="font-display text-xl font-bold text-celeste-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">
            Leyes destacadas
          </h2>
          <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            {featuredLaws.length} leyes · {featuredVotes.length} votos
          </span>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          Selección editorial con actas reales. Para el flujo completo de boleta,
          andá a Elegí tu lista.
        </p>
        <div className="panel p-4 sm:p-5">
          <FeaturedVotesExplorer laws={featuredLaws} votes={featuredVotes} />
        </div>
      </section>
    </div>
  );
}
