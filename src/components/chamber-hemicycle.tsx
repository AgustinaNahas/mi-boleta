"use client";

import { useMemo, useState, type MouseEvent } from "react";
import type { ChamberData, ChamberSeat } from "@/lib/data";

type Props = {
  chamber: ChamberData;
  /** legislator_id → voto normalizado (AFIRMATIVO, etc.) */
  votesByLegislator?: Map<string, string>;
  className?: string;
};

/** Etiquetas del mapa de bancas (suprabloques del gráfico HCDN). */
const CHART_GROUP_LABELS: Record<string, string> = {
  LLA: "La Libertad Avanza",
  UXP: "Unión por la Patria",
  FDC: "Fuerza del Cambio",
  UNIDOS: "Unidos",
  IF: "Innovación Federal",
  ELIJO: "Elijo Catamarca",
  IND: "Independencia",
  PYT: "Producción y Trabajo",
  CC: "Coalición Cívica",
  PO: "Partido Obrero (FIT-U)",
  PTS: "PTS–FIT Unidad",
  PSL: "Primero San Luis",
  LN: "La Neuquinidad",
  DC: "Defendamos Córdoba",
  COH: "Coherencia",
};

function seatGroup(seat: ChamberSeat) {
  return seat.bloque || seat.chart_group || "Sin bloque";
}

function groupLabel(code: string) {
  return CHART_GROUP_LABELS[code] ?? code;
}

function voteFill(voto: string | undefined) {
  if (!voto) return "#c8c8c8";
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "#12b76a";
  if (key === "negativo") return "#f04438";
  if (key === "abstencion") return "#d0d0d0";
  if (key === "ausente" || key === "presidente" || key === "otro") return "#ffffff";
  return "#c8c8c8";
}

function voteStroke(voto: string | undefined) {
  if (!voto) return "transparent";
  const key = voto.toLowerCase();
  if (key === "ausente" || key === "presidente" || key === "otro") return "#111111";
  if (key === "abstencion") return "#9a9a9a";
  return "transparent";
}

function voteLabel(voto: string | undefined, showVotes: boolean) {
  if (!showVotes) return null;
  if (!voto) return "Sin dato de voto";
  const key = voto.toLowerCase();
  if (key === "afirmativo") return "Afirmativo";
  if (key === "negativo") return "Negativo";
  if (key === "abstencion") return "Abstención";
  if (key === "ausente") return "Ausente";
  if (key === "presidente") return "Presidente";
  return voto;
}

type TipState = {
  seat: ChamberSeat;
  x: number;
  y: number;
};

/** Hemiciclo del recinto: color = voto; chips prendidos/apagados por bloque. */
export function ChamberHemicycle({
  chamber,
  votesByLegislator,
  className = "",
}: Props) {
  const showVotes = Boolean(votesByLegislator && votesByLegislator.size > 0);
  const [tip, setTip] = useState<TipState | null>(null);

  const forces = useMemo(() => {
    const counts = new Map<string, number>();
    for (const seat of chamber.seats) {
      const g = seatGroup(seat);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ code, count, label: groupLabel(code) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
  }, [chamber.seats]);

  // null = todos prendidos; Set = códigos apagados
  const [offGroups, setOffGroups] = useState<Set<string>>(() => new Set());

  function toggleGroup(code: string) {
    setOffGroups((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function setAllOn() {
    setOffGroups(new Set());
  }

  function setAllOff() {
    setOffGroups(new Set(forces.map((f) => f.code)));
  }

  function updateTip(seat: ChamberSeat, e: MouseEvent<SVGGElement>) {
    const root = e.currentTarget.ownerSVGElement?.parentElement;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    setTip({
      seat,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  const allOn = offGroups.size === 0;
  const allOff = forces.length > 0 && offGroups.size === forces.length;

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-40"
          onClick={setAllOn}
          disabled={allOn}
        >
          prender todos
        </button>
        <span className="text-ink-muted" aria-hidden>
          ·
        </span>
        <button
          type="button"
          className="text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-40"
          onClick={setAllOff}
          disabled={allOff}
        >
          apagar todos
        </button>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {forces.map((force) => {
          const on = !offGroups.has(force.code);
          return (
            <button
              key={force.code}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-medium transition ${
                on
                  ? "border-ink bg-white text-ink"
                  : "border-line-soft bg-transparent text-ink-muted opacity-45"
              }`}
              onClick={() => toggleGroup(force.code)}
              aria-pressed={on}
              title={on ? "Click para apagar" : "Click para prender"}
            >
              <span
                className={`h-2 w-2 rounded-full ${on ? "bg-ink" : "border border-ink-muted bg-transparent"}`}
                aria-hidden
              />
              <span>{force.label}</span>
              <span className="tabular-nums opacity-70">{force.count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <svg
          viewBox={chamber.viewBox}
          className="h-auto w-full"
          role="img"
          aria-label={
            showVotes
              ? "Hemiciclo de la Cámara: cada punto es un diputado; el color indica el voto en el proyecto seleccionado"
              : "Hemiciclo de la Cámara de Diputados"
          }
        >
          {chamber.seats.map((seat) => {
            const voto = votesByLegislator?.get(seat.legislator_id);
            const group = seatGroup(seat);
            const faded = offGroups.has(group);
            const stroke = showVotes ? voteStroke(voto) : "transparent";
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
            const href = seat.legislator_id
              ? `${basePath}/legislador/${seat.legislator_id}/`
              : undefined;
            return (
              <g
                key={`${seat.legislator_id}-${seat.seat_index}`}
                opacity={faded ? 0.08 : 1}
                className="transition-opacity duration-150"
                onMouseEnter={(e) => updateTip(seat, e)}
                onMouseMove={(e) => updateTip(seat, e)}
                onMouseLeave={() => setTip(null)}
              >
                {href ? (
                  <a href={href} aria-label={seat.nombre}>
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={4.5}
                      fill="transparent"
                      className="cursor-pointer"
                    />
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={3.1}
                      fill={showVotes ? voteFill(voto) : "#c8c8c8"}
                      stroke={stroke}
                      strokeWidth={stroke !== "transparent" ? 0.45 : 0}
                      className="pointer-events-none"
                    />
                  </a>
                ) : (
                  <>
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={4.5}
                      fill="transparent"
                    />
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={3.1}
                      fill={showVotes ? voteFill(voto) : "#c8c8c8"}
                      stroke={stroke}
                      strokeWidth={stroke !== "transparent" ? 0.45 : 0}
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {tip ? (
          <div
            className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[14px] border-2 border-ink bg-white p-2.5 shadow-[3px_3px_0_#111]"
            style={{
              left: tip.x,
              top: tip.y,
            }}
            role="tooltip"
          >
            <div className="flex items-start gap-2.5">
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]">
                {tip.seat.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URLs externas (ArgentinaDatos); export estático
                  <img
                    src={tip.seat.foto}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold leading-snug text-ink">
                  {tip.seat.nombre}
                </p>
                <p className="text-xs leading-snug text-ink-muted">
                  {tip.seat.bloque || groupLabel(seatGroup(tip.seat))}
                </p>
                {tip.seat.distrito ? (
                  <p className="text-[11px] text-ink-muted">{tip.seat.distrito}</p>
                ) : null}
                {showVotes ? (
                  <p className="text-[11px] font-medium text-ink">
                    {voteLabel(
                      votesByLegislator?.get(tip.seat.legislator_id),
                      true,
                    )}
                  </p>
                ) : null}
                {tip.seat.legislator_id ? (
                  <p className="text-[11px] text-ink-muted">Ver ficha →</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showVotes ? (
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-afirmativo" /> afirmativo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-negativo" /> negativo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-abstencion" /> abstención
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-ink bg-white" />{" "}
            ausente / sin dato
          </span>
        </div>
      ) : null}
    </div>
  );
}
