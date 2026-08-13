import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  formatLegislatorDisplayName,
  getFeaturedVotesForLegislator,
  getLegislatorBallotContext,
  getLegislatorById,
  getLegislatorIdsWithFeaturedVotes,
  getLegislatorVoteRows,
} from "@/lib/data";
import { LegislatorAvatar } from "@/components/legislator-avatar";
import { LegislatorVotesPanel } from "@/components/legislator-votes-panel";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getLegislatorIdsWithFeaturedVotes().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const legislator = getLegislatorById(id);
  const votes = getFeaturedVotesForLegislator(id);
  const rawName = legislator?.nombre ?? votes[0]?.legislador ?? id;
  const name = formatLegislatorDisplayName(rawName);
  return {
    title: `Qué votó ${name} · mi-boleta`,
    description: `Cómo votó ${name} en las leyes destacadas de mi-boleta.`,
  };
}

export default async function LegisladorPage({ params }: PageProps) {
  const { id } = await params;
  const legislator = getLegislatorById(id);
  const featuredVotes = getFeaturedVotesForLegislator(id);
  if (!legislator && featuredVotes.length === 0) notFound();

  const rawName =
    legislator?.nombre ?? featuredVotes[0]?.legislador ?? id;
  const name = formatLegislatorDisplayName(rawName);
  const foto =
    legislator?.foto || featuredVotes.find((v) => v.foto)?.foto || "";
  const ballot = getLegislatorBallotContext(id);
  const voteRows = getLegislatorVoteRows(id);

  const listLine = ballot?.listName
    ? `Lista: ${ballot.listName}`
    : featuredVotes[0]?.bloque
      ? `Bloque: ${featuredVotes[0].bloque}`
      : null;

  const electionLine = ballot?.electionYear
    ? `Electo en las Elecciones Generales de ${ballot.electionYear}`
    : ballot?.electionLabel
      ? `Electo en ${ballot.electionLabel}`
      : null;

  return (
    <article className="cols gap-y-12 pt-4 sm:pt-8">
      <header className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-12 lg:col-start-3">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          <LegislatorAvatar name={name} foto={foto} size="lg" />
          <div className="min-w-0 space-y-3">
            <h1 className="max-w-[18ch] text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              Qué #@%$&amp; votaste {name}?
            </h1>
            <div className="space-y-1 text-sm text-ink-muted sm:text-base">
              {listLine ? <p>{listLine}</p> : null}
              {electionLine ? <p>{electionLine}</p> : null}
              {!listLine && !electionLine ? (
                <p>
                  {[legislator?.distrito, featuredVotes[0]?.bloque]
                    .filter(Boolean)
                    .join(" · ") || "Diputado/a"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="col-span-4 sm:col-span-8 lg:col-span-12 lg:col-start-3">
        <LegislatorVotesPanel votes={voteRows} />
      </div>
    </article>
  );
}
