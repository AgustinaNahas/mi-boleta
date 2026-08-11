"use client";

import { useMemo, useState } from "react";
import type {
  BallotList,
  CandidateWithSeat,
  District,
  Election,
  FeaturedLaw,
  FeaturedVote,
} from "@/lib/data";
import { Hemicycle } from "@/components/hemicycle";
import { LegislatorAvatar } from "@/components/legislator-avatar";

function votePillClass(voto: string) {
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "vote-pill vote-afirmativo";
  if (key === "negativo") return "vote-pill vote-negativo";
  if (key === "abstencion") return "vote-pill vote-abstencion";
  return "vote-pill vote-ausente";
}

function voteDotColor(voto: string | undefined) {
  if (!voto) return null;
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "bg-afirmativo";
  if (key === "negativo") return "bg-negativo";
  if (key === "abstencion") return "bg-abstencion";
  return "border border-ink bg-white";
}

function countLabel(key: string) {
  const map: Record<string, string> = {
    AFIRMATIVO: "afirmativos",
    NEGATIVO: "negativos",
    ABSTENCION: "abstenciones",
    AUSENTE: "ausentes",
    PRESIDENTE: "presidente",
  };
  return map[key] ?? key.toLowerCase();
}

type Props = {
  elections: Election[];
  districts: District[];
  lists: BallotList[];
  candidates: CandidateWithSeat[];
  laws: FeaturedLaw[];
  votes: FeaturedVote[];
};

export function ElegirWizard({
  elections,
  districts,
  lists,
  candidates,
  laws,
  votes,
}: Props) {
  const readyElections = elections.filter((e) => e.status === "ready");
  const pendingElections = elections.filter((e) => e.status !== "ready");

  const [districtId, setDistrictId] = useState("");
  const [electionId, setElectionId] = useState("");
  const [listId, setListId] = useState("");
  const [lawId, setLawId] = useState("");

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

  const availableLaws = useMemo(() => {
    return [...laws]
      .filter((law) => {
        if (!law.date) return true;
        if (!earliestMandate) return true;
        return law.date >= earliestMandate;
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [laws, earliestMandate]);

  const selectedLaw = availableLaws.find((l) => l.id === lawId);

  const votesForLaw = useMemo(() => {
    if (!selectedLaw) return new Map<string, FeaturedVote>();
    const map = new Map<string, FeaturedVote>();
    for (const v of votes) {
      if (v.law_id !== selectedLaw.id) continue;
      map.set(v.legislator_id, v);
    }
    return map;
  }, [votes, selectedLaw]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {
      AFIRMATIVO: 0,
      NEGATIVO: 0,
      ABSTENCION: 0,
      AUSENTE: 0,
    };
    if (!selectedLaw) return acc;
    for (const person of elected) {
      if (
        person.mandato_inicio &&
        selectedLaw.date &&
        selectedLaw.date < person.mandato_inicio
      ) {
        continue;
      }
      if (
        person.mandato_fin &&
        selectedLaw.date &&
        selectedLaw.date > person.mandato_fin
      ) {
        continue;
      }
      if (!person.legislator_id) {
        acc.AUSENTE += 1;
        continue;
      }
      const vote = votesForLaw.get(person.legislator_id);
      const key = (vote?.voto ?? "AUSENTE").toUpperCase();
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, [elected, selectedLaw, votesForLaw]);

  const resultsReady = Boolean(selectedList);

  return (
    <div id="elegir" className="scroll-mt-8 space-y-14 sm:space-y-20">
      <section className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start lg:gap-16">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 z-0 hidden h-full w-screen -translate-x-1/2 overflow-hidden lg:block"
        >
          <Hemicycle
            variant="accent"
            className="absolute top-1/2 left-0 w-64 -translate-y-1/2 -translate-x-[48%] opacity-70"
          />
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Elegí tu lista
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted sm:text-base">
            Vas a ver la boleta, quiénes obtuvieron banca, y cómo votaron en
            las leyes destacadas posteriores a su asunción.
          </p>
          {pendingElections.length > 0 ? (
            <p className="text-xs leading-relaxed text-ink-muted">
              Pendiente de fuente oficial estructurada:{" "}
              {pendingElections.map((e) => e.label).join(" · ")}.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
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
              setLawId("");
            }}
          >
            <option value="">Distrito</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

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
              setLawId("");
            }}
            disabled={!districtId}
          >
            <option value="">Elección</option>
            {readyElections.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="wizard-list">
            Lista
          </label>
          <select
            id="wizard-list"
            className="field"
            value={listId}
            onChange={(e) => {
              setListId(e.target.value);
              setLawId("");
            }}
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
      </section>

      {resultsReady && selectedList ? (
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-14">
          <div className="space-y-5">
            {!selectedLaw ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl">
                    {selectedList.alliance}
                  </h3>
                  <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                    Candidatos a legisladores que entraron a formar parte de la
                    Cámara a partir de{" "}
                    {selectedElection?.label
                      ? `la ${selectedElection.label}`
                      : "la elección seleccionada"}
                    .
                  </p>
                </div>
                <label className="sr-only" htmlFor="wizard-proyecto">
                  Proyecto
                </label>
                <select
                  id="wizard-proyecto"
                  className="field"
                  value={lawId}
                  onChange={(e) => setLawId(e.target.value)}
                >
                  <option value="">Proyecto</option>
                  {availableLaws.map((law) => (
                    <option key={law.id} value={law.id}>
                      {law.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="sr-only" htmlFor="wizard-proyecto-active">
                  Proyecto
                </label>
                <select
                  id="wizard-proyecto-active"
                  className="field"
                  value={lawId}
                  onChange={(e) => setLawId(e.target.value)}
                >
                  <option value="">Proyecto</option>
                  {availableLaws.map((law) => (
                    <option key={law.id} value={law.id}>
                      {law.title}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["AFIRMATIVO", "NEGATIVO", "ABSTENCION", "AUSENTE"] as const
                  ).map((key) => (
                    <span key={key} className={votePillClass(key)}>
                      {countLabel(key)} {counts[key] ?? 0}
                    </span>
                  ))}
                </div>
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
            )}
          </div>

          <div>
            {elected.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nadie de esta lista figura como electo en el cruce actual.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                {elected.map((person) => {
                  const inOffice =
                    !selectedLaw?.date ||
                    ((!person.mandato_inicio ||
                      selectedLaw.date >= person.mandato_inicio) &&
                      (!person.mandato_fin ||
                        selectedLaw.date <= person.mandato_fin));
                  const vote =
                    selectedLaw && inOffice && person.legislator_id
                      ? votesForLaw.get(person.legislator_id)
                      : undefined;
                  const dot =
                    selectedLaw && inOffice
                      ? voteDotColor(vote?.voto ?? "AUSENTE")
                      : null;
                  return (
                    <li key={person.id} className="flex items-center gap-3">
                      <LegislatorAvatar
                        name={person.nombre}
                        foto={person.foto}
                        voteDotClass={dot}
                      />
                      <span className="min-w-0 text-sm font-medium leading-snug text-ink">
                        {person.nombre}
                      </span>
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
    </div>
  );
}
