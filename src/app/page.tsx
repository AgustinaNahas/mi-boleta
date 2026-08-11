import {
  getBallotLists,
  getCandidatesWithSeats,
  getChamberByLaw,
  getDistricts,
  getElections,
  getFeaturedLaws,
  getFeaturedVotes,
} from "@/lib/data";
import { ElegirWizard } from "@/components/elegir-wizard";
import { FeaturedVotesExplorer } from "@/components/featured-votes-explorer";
import { Hemicycle } from "@/components/hemicycle";

export default function HomePage() {
  const elections = getElections();
  const districts = getDistricts();
  const lists = getBallotLists();
  const candidates = getCandidatesWithSeats();
  const featuredLaws = getFeaturedLaws();
  const featuredVotes = getFeaturedVotes();
  const chamberByLaw = getChamberByLaw();

  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="relative pt-6 sm:pt-10">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)]">
          <div className="min-w-0 space-y-5">
            <h1 className="rise max-w-[14ch] text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Qué #@%$&amp; votaron?
            </h1>
            <p className="rise rise-delay-1 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
              Elegí la lista que votaste y mirá quiénes entraron — y cómo
              votaron las leyes que importan.
            </p>
          </div>

          <div className="rise rise-delay-1 flex flex-col items-center gap-8 lg:gap-10">
            <Hemicycle className="hidden h-[8.25rem] w-auto max-w-full lg:block" />
            <div className="flex flex-col items-center gap-3">
              <a href="#elegir" className="btn-outline w-full">
                Elegí tu lista
              </a>
              <p className="text-center text-xs text-ink-muted">
                Diputados nacionales — todas las provincias — 2019 a 2025
              </p>
            </div>
          </div>
        </div>
      </section>

      <ElegirWizard
        elections={elections}
        districts={districts}
        lists={lists}
        candidates={candidates}
        laws={featuredLaws}
        votes={featuredVotes}
      />

      <section id="buscar-proyecto" className="scroll-mt-8 space-y-6">
        <div className="max-w-xl space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Buscar por proyecto
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
            Selección editorial de leyes destacadas. El hemiciclo muestra a
            quienes estaban en funciones el día de la votación, coloreados por
            el voto.
          </p>
        </div>
        <FeaturedVotesExplorer
          laws={featuredLaws}
          votes={featuredVotes}
          chamberByLaw={chamberByLaw}
        />
      </section>
    </div>
  );
}
