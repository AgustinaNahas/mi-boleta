"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function formatLawDate(date?: string) {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isProceduralLaw(law: FeaturedLaw) {
  const hay = `${law.title} ${law.summary}`.toUpperCase();
  return (
    hay.includes("APARTAMIENTO") ||
    hay.includes("MOCIÓN") ||
    hay.includes("MOCION")
  );
}

const RELEVANCE_TERMS = [
  "ley bases",
  "paquete fiscal",
  "ganancias",
  "ficha limpia",
  "financiamiento universitario",
  "universitario",
  "garrahan",
  "jubil",
  "previsional",
  "moratoria",
  "movilidad",
  "presupuesto",
  "modernización laboral",
  "modernizacion laboral",
  "mercosur",
  "discapacidad",
  "privatiz",
  "grooming",
  "veto",
  "ludopat",
  "juicio en ausencia",
  "dnu",
  "reforma del estado",
  "sostenibilidad de la deuda",
];

function lawFamily(law: FeaturedLaw) {
  return law.title
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .split(/[—–]/)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function relevanceScore(law: FeaturedLaw) {
  const hay = `${law.title} ${law.summary}`.toLowerCase();
  let score = 0;
  if (isProceduralLaw(law)) return -1000;
  if (law.id.startsWith("auto-")) score -= 40;
  if (/^o\.?d\.?\s/i.test(law.title) || hay.includes("orden del día")) score -= 30;
  if (law.title === law.title.toUpperCase() && law.title.length > 20) score -= 25;
  if ((law.voteType ?? "general") === "general") score += 12;
  else score -= 6;
  for (const term of RELEVANCE_TERMS) {
    if (hay.includes(term)) score += 20;
  }
  if (hay.includes("sanción definitiva") || hay.includes("sancion definitiva")) {
    score += 8;
  }
  const year = Number((law.date ?? "").slice(0, 4));
  if (year >= 2020) score += year - 2020;
  return score;
}

function pickHighlightLaws(
  rows: { law: FeaturedLaw; score: number }[],
  n: number,
) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.score - a.score || (b.law.date ?? "").localeCompare(a.law.date ?? ""),
  );
  const picked: FeaturedLaw[] = [];
  const usedFamilies = new Set<string>();
  const yearCount = new Map<string, number>();

  for (const pass of [0, 1]) {
    for (const { law } of sorted) {
      if (picked.length >= n) break;
      if (picked.some((item) => item.id === law.id)) continue;
      const family = lawFamily(law);
      const year = (law.date ?? "").slice(0, 4);
      if (pass === 0) {
        if (usedFamilies.has(family)) continue;
        if ((yearCount.get(year) ?? 0) >= 2) continue;
      }
      picked.push(law);
      usedFamilies.add(family);
      yearCount.set(year, (yearCount.get(year) ?? 0) + 1);
    }
  }
  return picked;
}

function scrollToElement(el: HTMLElement | null) {
  if (!el) return;
  const header = document.querySelector("header");
  const offset = (header?.getBoundingClientRect().height ?? 72) + 12;
  const top = window.scrollY + el.getBoundingClientRect().top - offset;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: reduced ? "auto" : "smooth",
  });
}

function VoteCluster({
  count,
  tone,
}: {
  count: number;
  tone: VoteKey;
}) {
  if (count <= 0) return null;

  const maxDots = 24;
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
    <span className={`inline-flex min-w-0 items-center gap-2 ${color}`}>
      <span className="shrink-0 text-left text-[16px] font-bold tabular-nums">
        {count}
      </span>
      <span className="inline-flex items-center">
        {Array.from({ length: dots }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 shrink-0 rounded-full ${i > 0 ? "-ml-1" : ""} ${dotClass}`}
            style={{ zIndex: dots - i }}
            aria-hidden
          />
        ))}
        {count > maxDots ? (
          <span className="ml-1 text-[10px] text-ink-muted">
            +{count - maxDots}
          </span>
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
  const listMainRef = useRef<HTMLHeadingElement | null>(null);
  const lawMainRef = useRef<HTMLHeadingElement | null>(null);

  const [districtId, setDistrictId] = useState("");
  const [electionId, setElectionId] = useState("");
  const [listId, setListId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedLawId, setSelectedLawId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllVotes, setShowAllVotes] = useState(false);

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

  const visibleListLaws = useMemo(() => {
    if (showAllVotes) return listLaws;
    return listLaws.filter((law) => !isProceduralLaw(law));
  }, [listLaws, showAllVotes]);

  const votesByLaw = useMemo(() => {
    const map = new Map<string, Map<string, FeaturedVote>>();
    for (const v of votes) {
      if (!map.has(v.law_id)) map.set(v.law_id, new Map());
      map.get(v.law_id)!.set(v.legislator_id, v);
    }
    return map;
  }, [votes]);

  const listHighlights = useMemo(() => {
    if (elected.length === 0) {
      return { afirmativo: [] as FeaturedLaw[], negativo: [] as FeaturedLaw[] };
    }
    const ranked = listLaws
      .filter((law) => !isProceduralLaw(law))
      .map((law) => {
        const counts = countVotesForPeople(
          elected,
          law,
          votesByLaw.get(law.id) ?? new Map(),
        );
        const yes = counts.AFIRMATIVO;
        const no = counts.NEGATIVO;
        const stance =
          yes > no ? "AFIRMATIVO" : no > yes ? "NEGATIVO" : null;
        return {
          law,
          score: relevanceScore(law) + Math.min(yes + no, 6),
          stance,
        };
      })
      .filter((row) => row.stance);

    return {
      afirmativo: pickHighlightLaws(
        ranked.filter((row) => row.stance === "AFIRMATIVO"),
        5,
      ),
      negativo: pickHighlightLaws(
        ranked.filter((row) => row.stance === "NEGATIVO"),
        5,
      ),
    };
  }, [elected, listLaws, votesByLaw]);

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

  const lawVotesByForce = useMemo(() => {
    const byForce = new Map<string, FeaturedVote[]>();
    for (const row of lawVoteRows) {
      const force = (row.bloque || "Sin bloque").trim() || "Sin bloque";
      if (!byForce.has(force)) byForce.set(force, []);
      byForce.get(force)!.push(row);
    }
    return [...byForce.entries()]
      .map(([force, members]) => ({
        force,
        members: [...members].sort((a, b) =>
          a.legislador.localeCompare(b.legislador, "es"),
        ),
      }))
      .sort(
        (a, b) =>
          b.members.length - a.members.length ||
          a.force.localeCompare(b.force, "es"),
      );
  }, [lawVoteRows]);

  const listReady = Boolean(selectedList);
  const lawReady = Boolean(selectedLaw);
  const hydratedRef = useRef(false);
  const skipUrlWriteRef = useRef(false);

  function applyFromSearch(search: string) {
    const params = new URLSearchParams(search);
    const leyId = params.get("ley") ?? "";
    const listaParam = params.get("lista") ?? "";

    const law = laws.find((l) => l.id === leyId);
    if (law) {
      setSelectedLawId(law.id);
      setQuery(law.title);
      setElectionId("");
      setDistrictId("");
      setListId("");
      return;
    }

    const list = lists.find((l) => l.id === listaParam);
    if (list) {
      setSelectedLawId("");
      setQuery("");
      setElectionId(list.election_id);
      setDistrictId(list.district_id);
      setListId(list.id);
      return;
    }

    setSelectedLawId("");
    setQuery("");
    setListId("");
    setElectionId("");
    setDistrictId("");
  }

  useEffect(() => {
    applyFromSearch(window.location.search);
    hydratedRef.current = true;

    function onPopState() {
      skipUrlWriteRef.current = true;
      applyFromSearch(window.location.search);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // Solo al montar: laws/lists son estables para el cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("ley");
    url.searchParams.delete("lista");
    if (selectedLawId) url.searchParams.set("ley", selectedLawId);
    else if (listId) url.searchParams.set("lista", listId);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) {
      window.history.pushState({ mb: true }, "", next);
      window.dispatchEvent(new Event("mb:urlchange"));
    }
  }, [selectedLawId, listId]);

  useEffect(() => {
    if (!selectedLawId && !listId) return;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        scrollToElement(
          selectedLawId ? lawMainRef.current : listMainRef.current,
        );
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [selectedLawId, listId]);

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

  return (
    <div id="elegir" className="scroll-mt-8 space-y-12 sm:space-y-16">
      <section ref={selectorsRef} className="cols gap-y-3">
        <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-12 lg:col-start-3">
          <h2 className="text-center text-sm italic text-ink-muted sm:text-left">
            Buscá por lista
          </h2>
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
        <div className="relative col-span-4 space-y-3 sm:col-span-8 lg:col-span-12 lg:col-start-3">
          <h2 className="text-center text-sm italic text-ink-muted sm:text-left">
            Buscá por proyecto
          </h2>
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
        </div>
      </section>

      {listReady && selectedList ? (
        <section className="space-y-10 pt-24">
          <div className="cols gap-y-6">
            <div className="col-span-4 space-y-8 sm:col-span-8 lg:col-span-14 lg:col-start-2">
              <h2
                ref={listMainRef}
                className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              >
                ¿Qué votaron los que voté?
              </h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-afirmativo">
                    afirmativo por
                  </p>
                  {listHighlights.afirmativo.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                      No hay leyes destacadas a favor en este período.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {listHighlights.afirmativo.map((law) => (
                        <li key={law.id}>
                          <button
                            type="button"
                            className="cursor-pointer text-left text-lg font-semibold leading-snug text-ink transition hover:opacity-70"
                            onClick={() => pickLaw(law)}
                          >
                            {law.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-negativo">
                    negativo por
                  </p>
                  {listHighlights.negativo.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                      No hay leyes destacadas en contra en este período.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {listHighlights.negativo.map((law) => (
                        <li key={law.id}>
                          <button
                            type="button"
                            className="cursor-pointer text-left text-lg font-semibold leading-snug text-ink transition hover:opacity-70"
                            onClick={() => pickLaw(law)}
                          >
                            {law.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="cols gap-y-4">
            <div className="col-span-4 space-y-4 sm:col-span-8 lg:col-span-14 lg:col-start-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-medium tracking-tight text-ink">
                Populares
              </h2>
              <div className="flex flex-wrap items-center gap-4">
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
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-ink bg-white" />
                    ausentes
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-abstencion" />
                    abstención
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-afirmativo" />
                    afirmativos
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-negativo" />
                    negativos
                  </span>
                </div>
              </div>
            </div>

            {elected.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nadie de esta lista figura como electo en el cruce actual.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft border-y border-line-soft">
                {visibleListLaws.map((law) => {
                  const counts = countVotesForPeople(
                    elected,
                    law,
                    votesByLaw.get(law.id) ?? new Map(),
                  );
                  const active = law.id === selectedLawId;
                  const bajada =
                    law.summary.trim() === law.title.trim()
                      ? ""
                      : clampSummary(law.summary, 2);
                  return (
                    <li key={law.id}>
                      <button
                        type="button"
                        className={`grid w-full cursor-pointer grid-cols-1 items-start gap-3 py-4 text-left transition hover:bg-white/50 lg:grid-cols-[repeat(14,minmax(0,1fr))] ${
                          active ? "bg-white/70" : ""
                        }`}
                        onClick={() => pickLaw(law)}
                      >
                        <span className="text-[20px] font-bold leading-snug text-ink lg:col-span-4">
                          {law.title}
                        </span>
                        <span className="text-[12px] leading-relaxed text-ink-muted lg:col-span-5">
                          {bajada}
                        </span>
                        <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 lg:col-span-5">
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
        <section className="space-y-8 pt-24">
          <div className="cols items-start gap-y-4">
            <h2
              ref={lawMainRef}
              className="col-span-4 text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:col-span-8 sm:text-5xl lg:col-span-8 lg:text-[75px]"
            >
              {selectedLaw.title}
            </h2>
            <div className="col-span-4 space-y-3 text-left sm:col-span-8 lg:col-span-4 lg:col-start-11">
              {selectedLaw.date ? (
                <p className="text-sm font-medium text-ink sm:text-base">
                  {formatLawDate(selectedLaw.date)}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
                {selectedLaw.summary}
              </p>
              <p className="text-xs text-ink-muted">
                {selectedLaw.voteType ?? "general"}
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
            <div className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
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

          <div className="space-y-8">
            {lawVotesByForce.map(({ force, members }) => (
              <section key={force} className="space-y-3">
                <h4 className="text-base font-bold tracking-tight text-ink">
                  {force}
                </h4>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
                  {members.map((row) => {
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
                          className="flex items-center gap-2 transition hover:opacity-70"
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`}
                            aria-hidden
                          />
                          <span className="min-w-0 truncate text-base leading-snug text-ink">
                            {row.legislador}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
