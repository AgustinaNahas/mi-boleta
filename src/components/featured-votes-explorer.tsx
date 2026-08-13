"use client";

import { useMemo, useState } from "react";
import type { ChamberData, FeaturedLaw, FeaturedVote } from "@/lib/data";
import { clampSummary } from "@/components/law-tooltip";
import { LegislatorAvatar } from "@/components/legislator-avatar";
import { ChamberHemicycle } from "@/components/chamber-hemicycle";

function votePillClass(voto: string) {
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "vote-pill vote-afirmativo";
  if (key === "negativo") return "vote-pill vote-negativo";
  if (key === "abstencion") return "vote-pill vote-abstencion";
  return "vote-pill vote-ausente";
}

type Props = {
  laws: FeaturedLaw[];
  votes: FeaturedVote[];
  chamberByLaw: Record<string, ChamberData>;
};

export function FeaturedVotesExplorer({ laws, votes, chamberByLaw }: Props) {
  const sortedLaws = useMemo(
    () =>
      [...laws].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [laws],
  );
  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const v of votes) {
      if (v.distrito) set.add(v.distrito);
    }
    return ["Todos", ...[...set].sort((a, b) => a.localeCompare(b, "es"))];
  }, [votes]);

  const [lawId, setLawId] = useState(sortedLaws[0]?.id ?? "");
  const [district, setDistrict] = useState("Todos");

  const law = sortedLaws.find((l) => l.id === lawId) ?? sortedLaws[0];

  const votesForLaw = useMemo(() => {
    if (!law) return [] as FeaturedVote[];
    return votes.filter((v) => v.law_id === law.id);
  }, [votes, law]);

  const votesByLegislator = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of votesForLaw) {
      map.set(v.legislator_id, v.voto);
    }
    return map;
  }, [votesForLaw]);

  const filtered = useMemo(() => {
    return votesForLaw
      .filter((v) => (district === "Todos" ? true : v.distrito === district))
      .sort((a, b) => a.legislador.localeCompare(b.legislador, "es"));
  }, [votesForLaw, district]);

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
    <div className="cols gap-y-8">
      <div className="cols col-span-full gap-y-3">
        <div className="col-span-4 sm:col-span-4 lg:col-span-8">
          <label htmlFor="featured-law" className="sr-only">
            Proyecto
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
        <div className="col-span-4 sm:col-span-4 lg:col-span-8">
          <label htmlFor="featured-district" className="sr-only">
            Distrito
          </label>
          <select
            id="featured-district"
            className="field"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="col-span-full space-y-3">
        <p className="text-sm leading-relaxed text-ink-muted">{law.summary}</p>
        <div className="flex flex-wrap gap-2">
          {["AFIRMATIVO", "NEGATIVO", "ABSTENCION", "AUSENTE", "PRESIDENTE"].map(
            (key) =>
              counts[key] ? (
                <span key={key} className={votePillClass(key)}>
                  {key === "AFIRMATIVO"
                    ? "afirmativos"
                    : key === "NEGATIVO"
                      ? "negativos"
                      : key === "ABSTENCION"
                        ? "abstenciones"
                        : key === "AUSENTE"
                          ? "ausentes"
                          : key.toLowerCase()}{" "}
                  {counts[key]}
                </span>
              ) : null,
          )}
        </div>
        <p className="text-xs text-ink-muted">
          Selección editorial — {law.voteType ?? "general"}
          {law.actaId ? ` — acta ${law.actaId}` : ""}
          {law.sourceUrl ? (
            <>
              {" — "}
              <a
                href={law.sourceUrl}
                className="underline underline-offset-2 hover:text-ink"
                target="_blank"
                rel="noreferrer"
              >
                ver acta
              </a>
            </>
          ) : null}
        </p>
      </div>

      <div className="col-span-full space-y-3">
        <h3 className="text-lg font-semibold tracking-tight text-ink">
          El recinto en esta votación
        </h3>
        <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
          Cada punto es un diputado o diputada que figuraba en el acta de esa
          fecha. La posición aproxima el hemiciclo en gajos (cada bloque a la
          izquierda o derecha en todas las filas). El color es el voto en este
          proyecto.
        </p>
        {chamberByLaw[law.id] ? (
          <ChamberHemicycle
            chamber={chamberByLaw[law.id]}
            votesByLegislator={votesByLegislator}
            className="mx-auto w-full lg:max-w-none"
          />
        ) : (
          <p className="text-sm text-ink-muted">
            No hay hemiciclo generado para esta ley.
          </p>
        )}
      </div>

      <ul className="cols col-span-full gap-y-4">
        {filtered.map((row) => {
          const key = row.voto.toLowerCase();
          const dot =
            key === "afirmativo"
              ? "bg-afirmativo"
              : key === "negativo"
                ? "bg-negativo"
                : key === "abstencion"
                  ? "bg-abstencion"
                  : "border border-ink bg-white";
          return (
            <li
              key={`${row.legislator_id}-${row.law_id}`}
              className="col-span-4 flex items-center gap-3 sm:col-span-4 lg:col-span-8"
            >
              <LegislatorAvatar
                name={row.legislador}
                foto={row.foto}
                voteDotClass={dot}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{row.legislador}</p>
                <p className="text-xs text-ink-muted">{row.distrito || "—"}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
