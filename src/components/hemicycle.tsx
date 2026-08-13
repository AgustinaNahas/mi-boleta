"use client";

import { useEffect, useMemo, useState } from "react";
import chamberData from "../../data/processed/chamber_seats.json";

export type HemicycleSeat = {
  x: number;
  y: number;
};

type Props = {
  seats?: HemicycleSeat[];
  viewBox?: string;
  className?: string;
  /** Densidad visual: 'hero' (animado) o 'accent' (decorativo fijo). */
  variant?: "hero" | "accent";
  /** Cuántos puntos se colorean en la carga inicial (solo hero). */
  animatedCount?: number;
};

type VoteTone = "idle" | "afirmativo" | "negativo" | "ausente";
type ActiveTone = Exclude<VoteTone, "idle">;

const DEFAULT_SEATS: HemicycleSeat[] = chamberData.seats.map((s) => ({
  x: s.x,
  y: s.y,
}));
const DEFAULT_VIEWBOX = chamberData.viewBox ?? "0 0 280 155";

const TONE_STYLE: Record<
  VoteTone,
  { fill: string; stroke: string; strokeWidth: number }
> = {
  idle: { fill: "#c8c8c8", stroke: "transparent", strokeWidth: 0 },
  afirmativo: { fill: "#12b76a", stroke: "transparent", strokeWidth: 0 },
  negativo: { fill: "#f04438", stroke: "transparent", strokeWidth: 0 },
  ausente: { fill: "#ffffff", stroke: "#111111", strokeWidth: 0.45 },
};

const VOTE_TONES: ActiveTone[] = ["afirmativo", "negativo", "ausente"];

function shuffleIndices(length: number, count: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, length));
}

/** ~95% afirmativo/negativo, ~5% ausente (no se reparte en tercios). */
function randomTone(): ActiveTone {
  const r = Math.random();
  if (r < 0.05) return "ausente";
  return r < 0.525 ? "afirmativo" : "negativo";
}

/** Delay inicial de encendido: ~0.96s–3.6s (20% más lento que 0.8–3s). */
function randomIgniteDelayMs() {
  return 200 + Math.random() * 2640;
}

/** Intervalo entre cambios: 2s–4s. */
function randomTickDelayMs() {
  return Math.random() * 2000;
}

const IGNITE_TRANSITION_MS = 840;
const TICK_CHANGE_COUNT = 20;

/** Hemiciclo decorativo con el mismo layout de bancas que el gráfico del recinto. */
export function Hemicycle({
  seats = DEFAULT_SEATS,
  viewBox = DEFAULT_VIEWBOX,
  className = "",
  variant = "hero",
  animatedCount = 255,
}: Props) {
  const [tones, setTones] = useState<VoteTone[]>(() =>
    seats.map(() => "idle"),
  );

  const radius = variant === "hero" ? 3.35 : 3.1;

  const seatKey = useMemo(
    () => `${seats.length}:${viewBox}:${animatedCount}`,
    [seats.length, viewBox, animatedCount],
  );

  useEffect(() => {
    if (variant !== "hero") {
      setTones(seats.map(() => "idle"));
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const picked = shuffleIndices(seats.length, animatedCount);

    if (reduced) {
      const next: VoteTone[] = seats.map(() => "idle");
      for (const index of picked) next[index] = randomTone();
      setTones(next);
      return;
    }

    setTones(seats.map(() => "idle"));

    const igniteTimers: number[] = [];
    let tickTimer = 0;
    let startLoopTimer = 0;
    let cancelled = false;
    let maxIgniteDelay = 0;

    // Al cargar: cada banca elegida se prende con delay random (más lento).
    for (const index of picked) {
      const delay = randomIgniteDelayMs();
      if (delay > maxIgniteDelay) maxIgniteDelay = delay;
      const tone = randomTone();
      igniteTimers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setTones((current: VoteTone[]) => {
            const next = [...current];
            next[index] = tone;
            return next;
          });
        }, delay),
      );
    }

    // Recién cuando terminó la oleada + transición: rotar 5 bancas cada 2–4s, infinito.
    startLoopTimer = window.setTimeout(() => {
      if (cancelled) return;

      function scheduleTick() {
        tickTimer = window.setTimeout(() => {
          if (cancelled) return;

          setTones((current: VoteTone[]) => {
            const lit = current
              .map((tone, index) => ({ tone, index }))
              .filter((row) => row.tone !== "idle")
              .map((row) => row.index);

            const pool = lit.length > 0 ? lit : picked;
            const changeCount = Math.min(TICK_CHANGE_COUNT, pool.length);
            const targets = shuffleIndices(pool.length, changeCount).map(
              (i) => pool[i],
            );

            const next = [...current];
            for (const index of targets) {
              const currentTone = next[index];
              let tone = randomTone();
              if (tone === currentTone) {
                tone =
                  VOTE_TONES.find((t) => t !== currentTone) ?? randomTone();
              }
              next[index] = tone;
            }
            return next;
          });

          scheduleTick();
        }, randomTickDelayMs());
      }

      scheduleTick();
    }, maxIgniteDelay + IGNITE_TRANSITION_MS);

    return () => {
      cancelled = true;
      for (const id of igniteTimers) window.clearTimeout(id);
      window.clearTimeout(startLoopTimer);
      window.clearTimeout(tickTimer);
    };
  }, [seatKey, seats, animatedCount, variant]);

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      focusable="false"
      data-variant={variant}
    >
      {seats.map((seat, i) => {
        const style = TONE_STYLE[tones[i] ?? "idle"];
        const active = (tones[i] ?? "idle") !== "idle";
        return (
          <circle
            key={`${seat.x}-${seat.y}-${i}`}
            cx={seat.x}
            cy={seat.y}
            r={radius}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            style={{
              transitionProperty: "fill, stroke, stroke-width, opacity",
              transitionDuration: active ? `${IGNITE_TRANSITION_MS}ms` : "400ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              opacity: variant === "accent" ? 0.7 : active ? 1 : 0.92,
            }}
          />
        );
      })}
    </svg>
  );
}
