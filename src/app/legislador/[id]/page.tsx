import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFeaturedVotesForLegislator,
  getLegislatorById,
  getLegislatorIdsWithFeaturedVotes,
  getLegislatorVoteBuckets,
} from "@/lib/data";
import { LegislatorAvatar } from "@/components/legislator-avatar";

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
  const name = legislator?.nombre ?? votes[0]?.legislador ?? id;
  return {
    title: `Qué votó ${name} · mi-boleta`,
    description: `Cómo votó ${name} en las leyes destacadas de mi-boleta.`,
  };
}

function LawList({
  title,
  toneClass,
  rows,
}: {
  title: string;
  toneClass: string;
  rows: Array<{
    vote: { law_id: string; voto: string };
    law: { id: string; title: string; summary: string; date?: string } | undefined;
  }>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="flex items-baseline gap-2 text-2xl font-bold tracking-tight text-ink">
        <span className={`h-3 w-3 rounded-full ${toneClass}`} aria-hidden />
        {title}
        <span className="text-base font-medium text-ink-muted tabular-nums">
          {rows.length}
        </span>
      </h2>
      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {rows.map(({ vote, law }) => (
          <li key={`${vote.law_id}-${vote.voto}`} className="py-3.5">
            <p className="font-semibold leading-snug text-ink">
              {law?.title ?? vote.law_id}
            </p>
            {law?.summary ? (
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {law.summary}
              </p>
            ) : null}
            {law?.date ? (
              <p className="mt-1 text-xs text-ink-muted">{law.date}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function LegisladorPage({ params }: PageProps) {
  const { id } = await params;
  const legislator = getLegislatorById(id);
  const votes = getFeaturedVotesForLegislator(id);
  if (!legislator && votes.length === 0) notFound();

  const name = legislator?.nombre ?? votes[0]?.legislador ?? id;
  const distrito = legislator?.distrito ?? votes[0]?.distrito ?? "";
  const bloque = votes.find((v) => v.bloque)?.bloque ?? "";
  const foto = legislator?.foto || votes.find((v) => v.foto)?.foto || "";
  const buckets = getLegislatorVoteBuckets(id);

  return (
    <article className="cols gap-y-10 pt-4 sm:pt-8">
      <header className="col-span-4 space-y-5 sm:col-span-8 lg:col-span-12 lg:col-start-3">
        <p className="text-sm text-ink-muted">
          <Link href="/" className="underline underline-offset-2 hover:text-ink">
            Inicio
          </Link>
        </p>
        <div className="flex items-start gap-4 sm:gap-5">
          <LegislatorAvatar name={name} foto={foto} />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-ink-muted">Qué votó</p>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              {name}
            </h1>
            <p className="text-sm text-ink-muted sm:text-base">
              {[distrito, bloque].filter(Boolean).join(" · ") || "Diputado/a"}
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              Sobre la selección editorial de leyes de mi-boleta:{" "}
              <strong className="font-semibold text-ink">
                {buckets.aFavor.length}
              </strong>{" "}
              a favor,{" "}
              <strong className="font-semibold text-ink">
                {buckets.enContra.length}
              </strong>{" "}
              en contra,{" "}
              <strong className="font-semibold text-ink">
                {buckets.ausente.length}
              </strong>{" "}
              ausencias
              {buckets.abstencion.length
                ? ` y ${buckets.abstencion.length} abstenciones`
                : ""}
              .
            </p>
          </div>
        </div>
      </header>

      <div className="col-span-4 space-y-12 sm:col-span-8 lg:col-span-12 lg:col-start-3">
        <LawList
          title="A favor"
          toneClass="bg-afirmativo"
          rows={buckets.aFavor}
        />
        <LawList
          title="En contra"
          toneClass="bg-negativo"
          rows={buckets.enContra}
        />
        <LawList
          title="Abstenciones"
          toneClass="bg-abstencion"
          rows={buckets.abstencion}
        />
        <LawList
          title="Faltó / ausente"
          toneClass="border border-ink bg-white"
          rows={buckets.ausente}
        />
        <LawList
          title="Otros"
          toneClass="bg-ink"
          rows={buckets.otros}
        />

        {votes.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No hay votos destacados cargados para esta persona.
          </p>
        ) : null}
      </div>
    </article>
  );
}
