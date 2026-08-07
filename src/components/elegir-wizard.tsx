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
import { LawTooltip } from "@/components/law-tooltip";

function voteClass(voto: string) {
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "vote-pill vote-afirmativo";
  if (key === "negativo") return "vote-pill vote-negativo";
  if (key === "abstencion") return "vote-pill vote-abstencion";
  if (key === "presidente") return "vote-pill vote-presidente";
  return "vote-pill vote-ausente";
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

  const [districtId, setDistrictId] = useState(districts[0]?.id ?? "");
  const [electionId, setElectionId] = useState(readyElections[0]?.id ?? "");
  const [listId, setListId] = useState("");

  const availableLists = useMemo(() => {
    return lists
      .filter(
        (l) => l.district_id === districtId && l.election_id === electionId,
      )
      .sort((a, b) => a.alliance.localeCompare(b.alliance, "es"));
  }, [lists, districtId, electionId]);

  const effectiveListId = availableLists.some((l) => l.id === listId)
    ? listId
    : (availableLists[0]?.id ?? "");

  const selectedList = availableLists.find((l) => l.id === effectiveListId);

  const ballot = useMemo(() => {
    return candidates
      .filter((c) => c.list_id === effectiveListId)
      .sort((a, b) => Number(a.order) - Number(b.order));
  }, [candidates, effectiveListId]);

  const elected = ballot.filter((c) => c.elected === "true");

  const votesByLegislator = useMemo(() => {
    const map = new Map<string, FeaturedVote[]>();
    for (const v of votes) {
      if (!map.has(v.legislator_id)) map.set(v.legislator_id, []);
      map.get(v.legislator_id)!.push(v);
    }
    return map;
  }, [votes]);

  const lawsById = useMemo(() => {
    const map = new Map<string, FeaturedLaw>();
    for (const law of laws) map.set(law.id, law);
    return map;
  }, [laws]);

  return (
    <div className="space-y-8">
      <div className="panel space-y-4 p-4 sm:p-5">
        <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-celeste-deep dark:text-celeste">
          Paso a paso
        </p>
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <label
              htmlFor="wizard-district"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
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
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label
              htmlFor="wizard-election"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
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
              {readyElections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label
              htmlFor="wizard-list"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Alianza / agrupación
            </label>
            <select
              id="wizard-list"
              className="field"
              value={effectiveListId}
              onChange={(e) => setListId(e.target.value)}
              disabled={!availableLists.length}
            >
              {availableLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.alliance}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pendingElections.length > 0 ? (
          <p className="text-xs leading-relaxed text-ink-muted">
            Pendiente de fuente oficial estructurada:{" "}
            {pendingElections.map((e) => e.label).join(" · ")}.
          </p>
        ) : null}
      </div>

      {!selectedList ? (
        <p className="text-sm text-ink-muted">
          No hay listas cargadas para esta combinación.
        </p>
      ) : (
        <>
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">
                {selectedList.alliance}
              </h2>
              <p className="text-sm text-ink-muted">
                Boleta completa (titulares). Marcamos quién entró según la
                composición de la Cámara.
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-celeste-deep dark:text-celeste">
                {elected.length} de {ballot.length} obtuvieron banca
              </p>
            </div>

            {/* Mobile: lista apilada */}
            <ul className="space-y-2 sm:hidden">
              {ballot.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 border-b border-line/80 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-muted">
                      #{c.order}
                    </p>
                    <p className="font-medium leading-snug">{c.nombre}</p>
                  </div>
                  {c.elected === "true" ? (
                    <span className="vote-pill vote-afirmativo shrink-0">
                      Entró
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-ink-muted">No</span>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop: tabla compacta */}
            <div className="hidden overflow-hidden rounded-xl border border-line sm:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-celeste-soft/40 text-ink-muted dark:bg-navy-ink/50">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold">Candidato/a</th>
                    <th className="px-3 py-2.5 font-semibold">Banca</th>
                  </tr>
                </thead>
                <tbody>
                  {ballot.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-3 py-2.5 text-ink-muted">{c.order}</td>
                      <td className="px-3 py-2.5 font-medium">{c.nombre}</td>
                      <td className="px-3 py-2.5">
                        {c.elected === "true" ? (
                          <span className="vote-pill vote-afirmativo">
                            Entró
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-1">
              <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">
                Cómo votaron quienes entraron
              </h2>
              <p className="text-sm text-ink-muted">
                Solo leyes destacadas con fecha igual o posterior al inicio del
                mandato.
              </p>
            </div>

            {elected.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nadie de esta lista figura como electo en el cruce actual.
              </p>
            ) : (
              elected.map((person) => (
                <ElectoVotes
                  key={person.id}
                  person={person}
                  votes={votesByLegislator.get(person.legislator_id) ?? []}
                  lawsById={lawsById}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ElectoVotes({
  person,
  votes,
  lawsById,
}: {
  person: CandidateWithSeat;
  votes: FeaturedVote[];
  lawsById: Map<string, FeaturedLaw>;
}) {
  const inicio = person.mandato_inicio || "9999-99-99";
  const rows = votes
    .map((v) => {
      const law = lawsById.get(v.law_id);
      if (!law?.date || law.date < inicio) return null;
      return { vote: v, law };
    })
    .filter(Boolean) as { vote: FeaturedVote; law: FeaturedLaw }[];

  rows.sort((a, b) => (b.law.date ?? "").localeCompare(a.law.date ?? ""));

  return (
    <article className="panel space-y-3 p-4 sm:p-5">
      <div className="space-y-1">
        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-navy dark:text-white">
          {person.nombre}
        </h3>
        <p className="text-xs text-ink-muted">
          {person.mandato_inicio
            ? `Mandato desde ${person.mandato_inicio}`
            : "Sin fecha de inicio"}
          {person.match_confidence
            ? ` · match ${person.match_confidence}`
            : ""}
        </p>
      </div>

      {!person.legislator_id ? (
        <p className="text-sm text-ink-muted">
          Electo/a sin vínculo a votos todavía.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Sin votos en el set curado para este mandato.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ vote, law }) => (
            <li
              key={`${person.id}-${law.id}`}
              className="flex flex-col gap-1.5 border-t border-line/70 pt-2.5 first:border-0 first:pt-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
            >
              <span className={voteClass(vote.voto)}>{vote.voto}</span>
              <LawTooltip summary={law.summary} className="min-w-0">
                <span className="text-sm font-medium leading-snug text-ink">
                  {law.title}
                </span>
              </LawTooltip>
              <span className="text-xs text-ink-muted sm:ml-auto">
                {law.date}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
