"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

export function LegislatorVotesPanel({ votes }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return votes;
    return votes.filter((row) => {
      const hay = normalize(`${row.title} ${row.summary} ${row.date ?? ""}`);
      return hay.includes(q);
    });
  }, [votes, query]);

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
        <p className="text-center text-sm italic text-ink-muted">
          <a
            href="#proyectos"
            className="underline underline-offset-2 hover:text-ink"
          >
            ver proyectos
          </a>
        </p>
      </div>

      <ul id="proyectos" className="divide-y divide-line-soft border-y border-line-soft">
        {filtered.map((row) => (
          <li key={row.lawId}>
            <Link
              href={`/?ley=${encodeURIComponent(row.lawId)}`}
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
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {votes.length === 0
            ? "No hay votos destacados cargados para esta persona."
            : "No hay proyectos que coincidan con la búsqueda."}
        </p>
      ) : null}
    </div>
  );
}
