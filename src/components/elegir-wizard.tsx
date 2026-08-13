"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  BallotList,
  CandidateWithSeat,
  ChamberByLaw,
  District,
  Election,
  FeaturedLaw,
  FeaturedVote,
} from "@/lib/data";
import { clampSummary } from "@/components/law-tooltip";
import { LegislatorAvatar } from "@/components/legislator-avatar";
import { ChamberHemicycle } from "@/components/chamber-hemicycle";

type VoteKey = "AFIRMATIVO" | "NEGATIVO" | "ABSTENCION" | "AUSENTE";

type Props = {
  elections: Election[];
  districts: District[];
  lists: BallotList[];
  candidates: CandidateWithSeat[];
  laws: FeaturedLaw[];
  votes: FeaturedVote[];
  chamberByLaw: ChamberByLaw;
};

function voteDotColor(voto: string | undefined) {
  if (!voto) return null;
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "bg-afirmativo";
  if (key === "negativo") return "bg-negativo";
  if (key === "abstencion") return "bg-abstencion";
  return "border border-ink bg-white";
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function personInOffice(
  person: CandidateWithSeat,
  lawDate: string | undefined,
) {
  if (!lawDate) return true;
  if (person.mandato_inicio && lawDate < person.mandato_inicio) return false;
  if (person.mandato_fin && lawDate > person.mandato_fin) return false;
  return true;
}

function countVotesForPeople(
  people: CandidateWithSeat[],
  law: FeaturedLaw,
  votesByLegislator: Map<string, FeaturedVote>,
) {
  const acc: Record<VoteKey, number> = {
    AFIRMATIVO: 0,
    NEGATIVO: 0,
    ABSTENCION: 0,
    AUSENTE: 0,
  };
  for (const person of people) {
    if (!personInOffice(person, law.date)) continue;
    if (!person.legislator_id) {
      acc.AUSENTE += 1;
      continue;
    }
    const vote = votesByLegislator.get(person.legislator_id);
    const key = (vote?.voto ?? "AUSENTE").toUpperCase() as VoteKey;
    if (key in acc) acc[key] += 1;
    else acc.AUSENTE += 1;
  }
  return acc;
}

function VoteCluster({
  count,
  tone,
}: {
  count: number;
  tone: VoteKey;
}) {
  const maxDots = 18;
  const dots = Math.min(count, maxDots);
  const color =
    tone === "AFIRMATIVO"
      ? "text-afirmativo"
      : tone === "NEGATIVO"
        ? "text-negativo"
        : tone === "ABSTENCION"
          ? "text-ink-muted"
          : "text-ink";
  const dotClass =
    tone === "AFIRMATIVO"
      ? "bg-afirmativo"
      : tone === "NEGATIVO"
        ? "bg-negativo"
        : tone === "ABSTENCION"
          ? "bg-abstencion"
          : "border border-ink bg-white";

  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <span className="min-w-[1.25rem] text-right text-sm font-semibold tabular-nums">
        {count}
      </span>
      <span className="inline-flex flex-wrap items-center gap-[3px]">
        {Array.from({ length: dots }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
            aria-hidden
          />
        ))}
        {count > maxDots ? (
          <span className="text-[10px] text-ink-muted">+{count - maxDots}</span>
        ) : null}
      </span>
    </span>
  );
}

export function ElegirWizard({
  elections,
  districts,
  lists,
  candidates,
  laws,
  votes,
  chamberByLaw,
}: Props) {
  const readyElections = elections.filter((e) => e.status === "ready");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectorsRef = useRef<HTMLElement | null>(null);

  const [districtId, setDistrictId] = useState("");
  const [electionId, setElectionId] = useState("");
  const [listId, setListId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedLawId, setSelectedLawId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const availableLists = useMemo(() => {
    if (!districtId || !electionId) return [];
    return lists
      .filter(
        (l) => l.district_id === districtId && l.election_id === electionId,
      )
      .sort((a, b) => a.alliance.localeCompare(b.alliance, "es"));
  }, [lists, districtId, electionId]);

  const selectedList = availableLists.find((l) => l.id === listId);
  const selectedElection = readyElections.find((e) => e.id === electionId);
  const selectedLaw = laws.find((l) => l.id === selectedLawId);

  const elected = useMemo(() => {
    if (!listId) return [];
    return candidates
      .filter((c) => c.list_id === listId && c.elected === "true")
      .sort((a, b) => Number(a.order) - Number(b.order));
  }, [candidates, listId]);

  const earliestMandate = useMemo(() => {
    const dates = elected
      .map((p) => p.mandato_inicio)
      .filter(Boolean)
      .sort();
    return dates[0] ?? "";
  }, [elected]);

  const listLaws = useMemo(() => {
    return [...laws]
      .filter((law) => {
        if (!law.date) return true;
        if (!earliestMandate) return true;
        return law.date >= earliestMandate;
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [laws, earliestMandate]);

  const votesByLaw = useMemo(() => {
    const map = new Map<string, Map<string, FeaturedVote>>();
    for (const v of votes) {
      if (!map.has(v.law_id)) map.set(v.law_id, new Map());
      map.get(v.law_id)!.set(v.legislator_id, v);
    }
    return map;
  }, [votes]);

  const searchHits = useMemo(() => {
    const q = normalize(query);
    if (q.length < 1) return [];
    return [...laws]
      .filter((law) => {
        const hay = normalize(`${law.title} ${law.summary} ${law.date ?? ""}`);
        return hay.includes(q);
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 8);
  }, [laws, query]);

  const lawVotesByLegislator = useMemo(() => {
    if (!selectedLaw) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const v of votes) {
      if (v.law_id !== selectedLaw.id) continue;
      map.set(v.legislator_id, v.voto);
    }
    return map;
  }, [votes, selectedLaw]);

  const lawVoteRows = useMemo(() => {
    if (!selectedLaw) return [] as FeaturedVote[];
    return votes
      .filter((v) => v.law_id === selectedLaw.id)
      .sort((a, b) => a.legislador.localeCompare(b.legislador, "es"));
  }, [votes, selectedLaw]);

  const listReady = Boolean(selectedList);
  const lawReady = Boolean(selectedLaw);

  function pickLaw(law: FeaturedLaw) {
    setSelectedLawId(law.id);
    setQuery(law.title);
    setSearchOpen(false);
    // Vista por ley: sale la vista por lista.
    setElectionId("");
    setDistrictId("");
    setListId("");
  }

  function clearLaw() {
    setSelectedLawId("");
    setQuery("");
    setSearchOpen(false);
  }

  function pickList(nextListId: string) {
    setListId(nextListId);
    // Vista por lista: sale la vista por ley.
    if (nextListId) {
      setSelectedLawId("");
      setQuery("");
      setSearchOpen(false);
    }
  }

  function focusSelectors() {
    selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const first = selectorsRef.current?.querySelector("select");
    if (first instanceof HTMLSelectElement) first.focus();
  }

  return (
    <div id="elegir" className="scroll-mt-8 space-y-12 sm:space-y-16">
      <section ref={selectorsRef} className="cols gap-y-3">
        <div className="col-span-4 sm:col-span-8 lg:col-span-12 lg:col-start-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="sr-only" htmlFor="wizard-election">
                Elección
              </label>
              <select
                id="wizard-election"
                className="field"
                value={electionId}
                onChange={(e) => {
                  setElectionId(e.target.value);
                  setListId("");
                }}
              >
                <option value="">Elección</option>
                {readyElections.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="sr-only" htmlFor="wizard-district">
                Distrito
              </label>
              <select
                id="wizard-district"
                className="field"
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setListId("");
                }}
                disabled={!electionId}
              >
                <option value="">Distrito</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="sr-only" htmlFor="wizard-list">
                Lista
              </label>
              <select
                id="wizard-list"
                className="field"
                value={listId}
                onChange={(e) => pickList(e.target.value)}
                disabled={!districtId || !electionId || !availableLists.length}
              >
                <option value="">Lista</option>
                {availableLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.alliance}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section id="buscar-proyecto" className="cols scroll-mt-8 gap-y-3">
        <div className="relative col-span-4 sm:col-span-8 lg:col-span-12 lg:col-start-3">
          <label className="sr-only" htmlFor="law-search">
            Buscar proyecto
          </label>
          <div className="law-search">
            <span className="law-search-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M11.5 11.5 15.5 15.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              ref={searchRef}
              id="law-search"
              type="search"
              className="law-search-input"
              placeholder="Buscar proyecto..."
              value={query}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
                if (!e.target.value) setSelectedLawId("");
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                // Delay para permitir click en sugerencias.
                window.setTimeout(() => setSearchOpen(false), 120);
              }}
            />
            {selectedLawId ? (
              <button
                type="button"
                className="law-search-clear"
                onClick={clearLaw}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            ) : null}
          </div>

          {searchOpen && query.trim() && searchHits.length > 0 ? (
            <ul className="law-search-menu" role="listbox">
              {searchHits.map((law) => (
                <li key={law.id}>
                  <button
                    type="button"
                    className="law-search-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickLaw(law)}
                  >
                    <span className="font-medium text-ink">{law.title}</span>
                    <span className="block text-xs text-ink-muted">
                      {law.date ? `${law.date} · ` : ""}
                      {clampSummary(law.summary, 1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {searchOpen && query.trim() && searchHits.length === 0 ? (
            <p className="mt-2 text-center text-sm text-ink-muted">
              No hay proyectos que coincidan.
            </p>
          ) : null}

          <p className="mt-3 text-center text-sm italic text-ink-muted">
            <button
              type="button"
              className="underline underline-offset-2 hover:text-ink"
              onClick={focusSelectors}
            >
              buscá por lista
            </button>
          </p>
        </div>
      </section>

      {listReady && selectedList ? (
        <section className="space-y-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Populares
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-ink bg-white" />
                  ausentes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-abstencion" />
                  abstención
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-afirmativo" />
                  afirmativos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-negativo" />
                  negativos
                </span>
              </div>
            </div>

            {elected.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nadie de esta lista figura como electo en el cruce actual.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft border-y border-line-soft">
                {listLaws.map((law) => {
                  const counts = countVotesForPeople(
                    elected,
                    law,
                    votesByLaw.get(law.id) ?? new Map(),
                  );
                  const active = law.id === selectedLawId;
                  return (
                    <li key={law.id}>
                      <button
                        type="button"
                        className={`grid w-full grid-cols-1 items-start gap-3 py-4 text-left transition hover:bg-white/50 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] lg:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.2fr)_auto] ${
                          active ? "bg-white/70" : ""
                        }`}
                        onClick={() => pickLaw(law)}
                      >
                        <span className="text-base font-bold leading-snug text-ink sm:text-lg">
                          {law.title}
                        </span>
                        <span className="text-sm leading-relaxed text-ink-muted">
                          {clampSummary(law.summary, 2)}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
                          <VoteCluster count={counts.AUSENTE} tone="AUSENTE" />
                          <VoteCluster
                            count={counts.ABSTENCION}
                            tone="ABSTENCION"
                          />
                          <VoteCluster
                            count={counts.AFIRMATIVO}
                            tone="AFIRMATIVO"
                          />
                          <VoteCluster count={counts.NEGATIVO} tone="NEGATIVO" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl">
                {selectedList.alliance}
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
                Candidatos a legisladores que entraron a formar parte de la
                Cámara a partir de{" "}
                {selectedElection?.label
                  ? `la ${selectedElection.label}`
                  : "la elección seleccionada"}
                .
              </p>
            </div>

            {elected.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nadie de esta lista figura como electo en el cruce actual.
              </p>
            ) : (
              <ul className="cols gap-y-5">
                {elected.map((person) => {
                  const inOffice = personInOffice(person, selectedLaw?.date);
                  const vote =
                    selectedLaw && inOffice && person.legislator_id
                      ? votesByLaw
                          .get(selectedLaw.id)
                          ?.get(person.legislator_id)
                      : undefined;
                  const dot =
                    selectedLaw && inOffice
                      ? voteDotColor(vote?.voto ?? "AUSENTE")
                      : null;
                  return (
                    <li
                      key={person.id}
                      className="col-span-4 flex items-center gap-3 sm:col-span-4 lg:col-span-8"
                    >
                      {person.legislator_id ? (
                        <Link
                          href={`/legislador/${person.legislator_id}/`}
                          className="flex min-w-0 items-center gap-3 transition hover:opacity-80"
                        >
                          <LegislatorAvatar
                            name={person.nombre}
                            foto={person.foto}
                            voteDotClass={dot}
                          />
                          <span className="min-w-0 text-sm font-medium leading-snug text-ink">
                            {person.nombre}
                          </span>
                        </Link>
                      ) : (
                        <>
                          <LegislatorAvatar
                            name={person.nombre}
                            foto={person.foto}
                            voteDotClass={dot}
                          />
                          <span className="min-w-0 text-sm font-medium leading-snug text-ink">
                            {person.nombre}
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : districtId && electionId && availableLists.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No hay listas cargadas para esta combinación.
        </p>
      ) : null}

      {lawReady && selectedLaw ? (
        <section className="space-y-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {selectedLaw.title}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
                  {selectedLaw.summary}
                </p>
                <p className="text-xs text-ink-muted">
                  Selección editorial — {selectedLaw.voteType ?? "general"}
                  {selectedLaw.actaId ? ` — acta ${selectedLaw.actaId}` : ""}
                  {selectedLaw.sourceUrl ? (
                    <>
                      {" — "}
                      <a
                        href={selectedLaw.sourceUrl}
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
              <button
                type="button"
                className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
                onClick={clearLaw}
              >
                cerrar proyecto
              </button>
            </div>
          </div>

          <div className="cols gap-y-3">
            <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-12 lg:col-start-3">
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                El recinto en esta votación
              </h3>
              {chamberByLaw[selectedLaw.id] ? (
                <ChamberHemicycle
                  chamber={chamberByLaw[selectedLaw.id]}
                  votesByLegislator={lawVotesByLegislator}
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-ink-muted">
                  No hay hemiciclo generado para esta ley.
                </p>
              )}
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {lawVoteRows.map((row) => {
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
                <li key={`${row.legislator_id}-${row.law_id}`}>
                  <Link
                    href={`/legislador/${row.legislator_id}/`}
                    className="flex items-center gap-3 rounded-lg transition hover:opacity-80"
                  >
                    <LegislatorAvatar
                      name={row.legislador}
                      foto={row.foto}
                      voteDotClass={dot}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {row.legislador}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {row.distrito || "—"} · {row.voto.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
