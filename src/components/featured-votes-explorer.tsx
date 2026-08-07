"use client";

import { useMemo, useState } from "react";
import type { FeaturedLaw, FeaturedVote } from "@/lib/data";
import { clampSummary } from "@/components/law-tooltip";

function voteClass(voto: string) {
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "vote-pill vote-afirmativo";
  if (key === "negativo") return "vote-pill vote-negativo";
  if (key === "abstencion") return "vote-pill vote-abstencion";
  if (key === "presidente") return "vote-pill vote-presidente";
  return "vote-pill vote-ausente";
}

const PILOT_DISTRICTS = ["Todos", "CABA", "Buenos Aires"] as const;

type Props = {
  laws: FeaturedLaw[];
  votes: FeaturedVote[];
};

export function FeaturedVotesExplorer({ laws, votes }: Props) {
  const sortedLaws = useMemo(
    () =>
      [...laws].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [laws],
  );
  const [lawId, setLawId] = useState(sortedLaws[0]?.id ?? "");
  const [district, setDistrict] =
    useState<(typeof PILOT_DISTRICTS)[number]>("Todos");

  const law = sortedLaws.find((l) => l.id === lawId) ?? sortedLaws[0];

  const filtered = useMemo(() => {
    if (!law) return [];
    return votes
      .filter((v) => v.law_id === law.id)
      .filter((v) =>
        district === "Todos" ? true : v.distrito === district,
      )
      .sort((a, b) => a.legislador.localeCompare(b.legislador, "es"));
  }, [votes, law, district]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const row of filtered) {
      acc[row.voto] = (acc[row.voto] ?? 0) + 1;
    }
    return acc;
  }, [filtered]);

  if (!law) {
    return (
      <p className="text-sm text-ink-muted">No hay leyes destacadas cargadas.</p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <label
            htmlFor="featured-law"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Ley destacada
          </label>
          <select
            id="featured-law"
            className="field"
            value={law.id}
            onChange={(e) => setLawId(e.target.value)}
          >
            {sortedLaws.map((item) => (
              <option
                key={item.id}
                value={item.id}
                title={clampSummary(item.summary)}
              >
                {item.date ? `${item.date} · ` : ""}
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:max-w-[14rem]">
          <label
            htmlFor="featured-district"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Distrito
          </label>
          <select
            id="featured-district"
            className="field"
            value={district}
            onChange={(e) =>
              setDistrict(e.target.value as (typeof PILOT_DISTRICTS)[number])
            }
          >
            {PILOT_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-ink-muted">{law.summary}</p>
        <p className="text-xs text-ink-muted">
          Selección editorial · {law.voteType ?? "general"}
          {law.actaId ? ` · acta ${law.actaId}` : ""}
          {law.sourceUrl ? (
            <>
              {" · "}
              <a
                href={law.sourceUrl}
                className="font-semibold text-celeste-deep underline underline-offset-2 hover:text-navy dark:text-celeste dark:hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                ver acta
              </a>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["AFIRMATIVO", "NEGATIVO", "ABSTENCION", "AUSENTE", "PRESIDENTE"].map(
          (key) =>
            counts[key] ? (
              <span key={key} className={voteClass(key)}>
                {key}: {counts[key]}
              </span>
            ) : null,
        )}
        <span className="vote-pill border border-line bg-transparent text-ink-muted">
          Total: {filtered.length}
        </span>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 sm:hidden">
        {filtered.map((row) => (
          <li
            key={`${row.legislator_id}-${row.law_id}`}
            className="flex items-start justify-between gap-3 border-b border-line/80 py-3 last:border-0"
          >
            <div className="min-w-0">
              <p className="font-medium leading-snug">{row.legislador}</p>
              <p className="text-xs text-ink-muted">
                {row.distrito || "—"}
                {row.voto_raw ? ` · raw: ${row.voto_raw}` : ""}
              </p>
            </div>
            <span className={`shrink-0 ${voteClass(row.voto)}`}>{row.voto}</span>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-line sm:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-celeste-soft/40 text-ink-muted dark:bg-navy-ink/50">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Legislador/a</th>
              <th className="px-3 py-2.5 font-semibold">Distrito</th>
              <th className="px-3 py-2.5 font-semibold">Voto</th>
              <th className="px-3 py-2.5 font-semibold">Raw</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={`${row.legislator_id}-${row.law_id}`}
                className="border-t border-line"
              >
                <td className="px-3 py-2.5 font-medium">{row.legislador}</td>
                <td className="px-3 py-2.5 text-ink-muted">
                  {row.distrito || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span className={voteClass(row.voto)}>{row.voto}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-muted">
                  {row.voto_raw}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
