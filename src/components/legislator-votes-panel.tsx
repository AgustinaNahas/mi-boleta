"use client";

import { useMemo, useState } from "react";
import type { LegislatorVoteRow } from "@/lib/data";
import { clampSummary } from "@/components/law-tooltip";

type Props = {
  votes: LegislatorVoteRow[];
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function votePillClass(voto: string) {
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "vote-pill vote-afirmativo";
  if (key === "negativo") return "vote-pill vote-negativo";
  if (key === "abstencion") return "vote-pill vote-abstencion";
  return "vote-pill vote-ausente";
}

function votePillLabel(voto: string) {
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "voto afirmativo";
  if (key === "negativo") return "voto negativo";
  if (key === "abstencion") return "abstención";
  if (key === "ausente") return "ausente";
  if (key === "presidente") return "presidente";
  return `voto ${key}`;
}

function isProceduralLaw(row: LegislatorVoteRow) {
  const hay = `${row.title} ${row.summary}`.toUpperCase();
  return (
    hay.includes("APARTAMIENTO") ||
    hay.includes("MOCIÓN") ||
    hay.includes("MOCION")
  );
}

export function LegislatorVotesPanel({ votes }: Props) {
  const [query, setQuery] = useState("");
  const [showAllVotes, setShowAllVotes] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return votes.filter((row) => {
      if (!showAllVotes && isProceduralLaw(row)) return false;
      if (!q) return true;
      const hay = normalize(`${row.title} ${row.summary} ${row.date ?? ""}`);
      return hay.includes(q);
    });
  }, [votes, query, showAllVotes]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <label className="sr-only" htmlFor="legislator-law-search">
          Buscar proyecto
        </label>
        <div className="law-search">
          <span className="law-search-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle
                cx="7.5"
                cy="7.5"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M11.5 11.5 15.5 15.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            id="legislator-law-search"
            type="search"
            className="law-search-input"
            placeholder="Buscar proyecto..."
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="law-search-clear"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          ) : null}
        </div>
        <div
          className="inline-flex rounded-full border border-ink text-xs font-medium"
          role="group"
          aria-label="Filtro de votaciones"
        >
          <button
            type="button"
            className={`cursor-pointer rounded-full px-3 py-1.5 ${
              !showAllVotes ? "bg-ink text-white" : "text-ink"
            }`}
            onClick={() => setShowAllVotes(false)}
            aria-pressed={!showAllVotes}
          >
            Leyes principales
          </button>
          <button
            type="button"
            className={`cursor-pointer rounded-full px-3 py-1.5 ${
              showAllVotes ? "bg-ink text-white" : "text-ink"
            }`}
            onClick={() => setShowAllVotes(true)}
            aria-pressed={showAllVotes}
          >
            Todas las votaciones
          </button>
        </div>
      </div>

      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {filtered.map((row) => (
          <li key={row.lawId}>
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/?ley=${encodeURIComponent(row.lawId)}`}
              className="grid cursor-pointer grid-cols-1 items-start gap-3 py-5 sm:grid-cols-[minmax(10rem,0.9fr)_minmax(0,1.4fr)_auto] sm:gap-6"
            >
              <p className="text-base font-bold leading-snug text-ink sm:text-lg">
                {row.title}
              </p>
              <p className="text-sm leading-relaxed text-ink-muted">
                {clampSummary(row.summary, 2) || "Sin resumen disponible."}
              </p>
              <span className={votePillClass(row.voto)}>
                {votePillLabel(row.voto)}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {votes.length === 0
            ? "No hay votos destacados cargados para esta persona."
            : query
              ? "No hay proyectos que coincidan con la búsqueda."
              : "No hay leyes principales en este set. Probá “Todas las votaciones”."}
        </p>
      ) : null}
    </div>
  );
}
