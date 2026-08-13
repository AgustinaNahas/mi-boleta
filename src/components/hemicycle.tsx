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

function randomTone(): ActiveTone {
  return VOTE_TONES[Math.floor(Math.random() * VOTE_TONES.length)];
}

/** Delay inicial de encendido: 0.8s–3s. */
function randomIgniteDelayMs() {
  return 800 + Math.random() * 2200;
}

/** Intervalo entre cambios: 2s–4s. */
function randomTickDelayMs() {
  return 2000 + Math.random() * 2000;
}

/** Cuántos puntos recolorar en cada tick: 4 o 5. */
function randomChangeCount() {
  return Math.random() < 0.5 ? 4 : 5;
}

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
    let cancelled = false;

    // Al cargar: cada banca elegida se prende entre 0.8s y 3s.
    for (const index of picked) {
      const delay = randomIgniteDelayMs();
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

    // Cuando terminó la oleada inicial, empezar a rotar 4/5 puntos.
    const initialWaveMs = 3000;
    const startLoopTimer = window.setTimeout(() => {
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
            const changeCount = Math.min(randomChangeCount(), pool.length);
            const targets = shuffleIndices(pool.length, changeCount).map(
              (i) => pool[i],
            );

            const next = [...current];
            for (const index of targets) {
              const currentTone = next[index];
              let tone = randomTone();
              // Evitar quedarse en el mismo color si se puede.
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
    }, initialWaveMs);

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
              transitionDuration: active ? "700ms" : "400ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              opacity: variant === "accent" ? 0.7 : active ? 1 : 0.92,
            }}
          />
        );
      })}
    </svg>
  );
}
