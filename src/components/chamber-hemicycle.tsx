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

/** Hemiciclo del recinto actual: posición fija por bloque; color = voto del proyecto. */
export function ChamberHemicycle({
  chamber,
  votesByLegislator,
  className = "",
}: Props) {
  const showVotes = Boolean(votesByLegislator && votesByLegislator.size > 0);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
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

  return (
    <div className={className}>
      <div
        className="mb-4 flex flex-wrap justify-center gap-2"
        onMouseLeave={() => setFocusGroup(null)}
      >
        {forces.map((force) => {
          const active = focusGroup === force.code;
          const dimmed = focusGroup != null && !active;
          return (
            <button
              key={force.code}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-medium text-ink transition-opacity"
              style={{ opacity: dimmed ? 0.35 : 1 }}
              onMouseEnter={() => setFocusGroup(force.code)}
              onFocus={() => setFocusGroup(force.code)}
              onBlur={() => setFocusGroup(null)}
              aria-pressed={active}
            >
              <span>{force.label}</span>
              <span className="tabular-nums text-ink-muted">{force.count}</span>
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
            const faded = focusGroup != null && group !== focusGroup;
            const stroke = showVotes ? voteStroke(voto) : "transparent";
            return (
              <g
                key={`${seat.legislator_id}-${seat.seat_index}`}
                opacity={faded ? 0.14 : 1}
                className="transition-opacity duration-150"
                onMouseEnter={(e) => updateTip(seat, e)}
                onMouseMove={(e) => updateTip(seat, e)}
                onMouseLeave={() => setTip(null)}
              >
                {/* Área de hit más grande */}
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
