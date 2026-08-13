import {
  getBallotLists,
  getCandidatesWithSeats,
  getChamberByLaw,
  getChamberSeats,
  getDistricts,
  getElections,
  getFeaturedLaws,
  getFeaturedVotes,
} from "@/lib/data";
import { ElegirWizard } from "@/components/elegir-wizard";
import { Hemicycle } from "@/components/hemicycle";

export default function HomePage() {
  const elections = getElections();
  const districts = getDistricts();
  const lists = getBallotLists();
  const candidates = getCandidatesWithSeats();
  const featuredLaws = getFeaturedLaws();
  const featuredVotes = getFeaturedVotes();
  const chamberByLaw = getChamberByLaw();
  const chamber = getChamberSeats();
  const hemicycleSeats = chamber.seats.map((s) => ({ x: s.x, y: s.y }));

  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="relative pt-6 sm:pt-24">
        <div className="cols items-stretch gap-y-8">
          <div className="col-span-4 flex min-w-0 flex-col justify-center space-y-5 sm:col-span-8 lg:col-span-8">
            <h1 className="rise max-w-[14ch] text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[88px]">
            ¿Qué #@%$&amp; votaron?
            </h1>
            <p className="rise rise-delay-1 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
              Elegí la lista que votaste y mirá quiénes entraron — y cómo
              votaron las leyes que importan.
            </p>
          </div>

          <div className="rise rise-delay-1 col-span-4 flex items-center justify-center sm:col-span-8 lg:col-span-8">
            <Hemicycle
              seats={hemicycleSeats}
              viewBox={chamber.viewBox}
              className="hidden h-auto w-full max-w-full lg:block"
            />
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
        chamberByLaw={chamberByLaw}
      />
    </div>
  );
}
