import { ElegirWizard } from "@/components/elegir-wizard";
import { EscarapelaMark } from "@/components/escarapela-mark";
import {
  getBallotLists,
  getCandidatesWithSeats,
  getDistricts,
  getElections,
  getFeaturedLaws,
  getFeaturedVotes,
} from "@/lib/data";

export default function ElegirPage() {
  const elections = getElections();
  const districts = getDistricts();
  const lists = getBallotLists();
  const candidates = getCandidatesWithSeats();
  const laws = getFeaturedLaws();
  const votes = getFeaturedVotes();

  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-4 border border-line bg-paper-elevated px-5 py-7 sm:px-7">
        <div className="min-w-0 space-y-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-celeste-deep dark:text-celeste">
            Piloto · CABA y Buenos Aires
          </p>
          <h1 className="max-w-[16ch] font-display text-4xl font-bold uppercase tracking-wide text-navy sm:text-5xl dark:text-white">
            Elegí tu lista
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
            Distrito, elección y alianza. Vas a ver la boleta, quiénes obtuvieron
            banca, y cómo votaron en las leyes destacadas posteriores a su
            asunción.
          </p>
        </div>
        <EscarapelaMark className="mt-1 h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
      </section>

      <ElegirWizard
        elections={elections}
        districts={districts}
        lists={lists}
        candidates={candidates}
        laws={laws}
        votes={votes}
      />
    </div>
  );
}
