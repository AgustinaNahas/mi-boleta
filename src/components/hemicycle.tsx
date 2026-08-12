type Props = {
  className?: string;
  /** Densidad visual: 'hero' (completo) o 'accent' (parcial / decorativo). */
  variant?: "hero" | "accent";
};

type VoteTone = "idle" | "afirmativo" | "negativo" | "ausente";

type PlanStep = {
  index: number;
  tone: Exclude<VoteTone, "idle">;
  /** Progreso de scroll 0–1 a partir del cual el punto puede encenderse. */
  at: number;
  /** Delay en ms antes de arrancar la transición de color. */
  delayMs: number;
};

const TONE_STYLE: Record<
  VoteTone,
  { fill: string; stroke: string; strokeWidth: number }
> = {
  idle: { fill: "#c8c8c8", stroke: "transparent", strokeWidth: 0 },
  afirmativo: { fill: "#12b76a", stroke: "transparent", strokeWidth: 0 },
  negativo: { fill: "#f04438", stroke: "transparent", strokeWidth: 0 },
  ausente: { fill: "#ffffff", stroke: "#111111", strokeWidth: 0.45 },
};

const VOTE_TONES: Exclude<VoteTone, "idle">[] = [
  "afirmativo",
  "negativo",
  "ausente",
];

function shuffleIndices(length: number, count: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, length));
}

/** Delay corto para que la cámara se llene antes de salir de pantalla. */
function randomDelayMs() {
  return 40 + Math.random() * 560; // ~0.04–0.6s
}

function buildPlan(seatCount: number, animatedCount: number): PlanStep[] {
  const picked = shuffleIndices(seatCount, animatedCount);
  return picked.map((index, i) => {
    const stagger = picked.length <= 1 ? 0 : i / (picked.length - 1);
    return {
      index,
      tone: VOTE_TONES[Math.floor(Math.random() * VOTE_TONES.length)],
      // Ventana corta de scroll: se habilitan pronto y juntos.
      at: 0.02 + stagger * 0.45 + (Math.random() - 0.5) * 0.04,
      delayMs: randomDelayMs(),
    };
  });
}

function tonesFromPlan(
  seatCount: number,
  plan: PlanStep[],
  progress: number,
  now: number,
  armedAt: Map<number, number>,
): VoteTone[] {
  const next: VoteTone[] = Array.from({ length: seatCount }, () => "idle");
  for (const step of plan) {
    if (progress < step.at) continue;
    if (!armedAt.has(step.index)) {
      armedAt.set(step.index, now + step.delayMs);
    }
    const igniteAt = armedAt.get(step.index) ?? now;
    if (now >= igniteAt) next[step.index] = step.tone;
  }
  return next;
}

function sameTones(a: VoteTone[], b: VoteTone[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Hemiciclo decorativo con el mismo layout de bancas que el gráfico del recinto. */
export function Hemicycle({
  seats,
  viewBox = "0 0 280 155",
  className = "",
  variant = "hero",
  animatedCount = 255,
}: Props) {
  const planRef = useRef<PlanStep[]>([]);
  const armedAtRef = useRef<Map<number, number>>(new Map());
  const lastProgressRef = useRef(0);
  const [tones, setTones] = useState<VoteTone[]>(() =>
    seats.map(() => "idle"),
  );

  const radius = variant === "hero" ? 3.35 : 3.1;

  const seatKey = useMemo(
    () => `${seats.length}:${viewBox}:${animatedCount}`,
    [seats.length, viewBox, animatedCount],
  );

  useEffect(() => {
    function resetPlan() {
      planRef.current = buildPlan(seats.length, animatedCount);
      armedAtRef.current = new Map();
    }

    resetPlan();

    if (variant !== "hero") {
      setTones(seats.map(() => "idle"));
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const next: VoteTone[] = seats.map(() => "idle");
      for (const step of planRef.current) next[step.index] = step.tone;
      setTones(next);
      return;
    }

    setTones(seats.map(() => "idle"));

    let raf = 0;
    let timer = 0;

    function measureProgress() {
      // Con ~18% del viewport ya llega a 1: se llena rápido arriba del fold.
      return Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.18)));
    }

    function apply() {
      const y = window.scrollY;
      const progress = measureProgress();
      const now = performance.now();

      // Volver al tope: apaga todo y arma un plan nuevo para el próximo scroll.
      if (y <= 16) {
        const wasActive =
          lastProgressRef.current > 0 || armedAtRef.current.size > 0;
        if (wasActive) {
          resetPlan();
          setTones(seats.map(() => "idle"));
        }
        lastProgressRef.current = 0;
        return;
      }

      lastProgressRef.current = progress;

      setTones((current) => {
        const next = tonesFromPlan(
          seats.length,
          planRef.current,
          progress,
          now,
          armedAtRef.current,
        );
        return sameTones(current, next) ? current : next;
      });

      // Seguir tickeando mientras haya puntos armados esperando su delay.
      let nextIgnite = Infinity;
      for (const t of armedAtRef.current.values()) {
        if (t > now && t < nextIgnite) nextIgnite = t;
      }
      if (Number.isFinite(nextIgnite)) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          raf = requestAnimationFrame(apply);
        }, Math.max(16, nextIgnite - now));
      }
    }

    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [seatKey, seats.length, animatedCount, variant]);

  return (
    <svg
      viewBox="0 0 529 268"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      focusable="false"
      data-variant={variant}
    >
      <circle
        cx="245.073"
        cy="220.66"
        r="15.5466"
        transform="rotate(55.5514 245.073 220.66)"
        fill="#D9D9D9"
      />
      <circle
        cx="265.038"
        cy="177.431"
        r="15.5466"
        transform="rotate(55.5514 265.038 177.431)"
        fill="#D9D9D9"
      />
      <circle
        cx="223.458"
        cy="187.243"
        r="15.5466"
        transform="rotate(55.5514 223.458 187.243)"
        fill="#D9D9D9"
      />
      <circle
        cx="241.174"
        cy="141.21"
        r="15.5466"
        transform="rotate(55.5514 241.174 141.21)"
        fill="#D9D9D9"
      />
      <circle
        cx="243.551"
        cy="100.078"
        r="15.5466"
        transform="rotate(55.5514 243.551 100.078)"
        fill="#D9D9D9"
      />
      <circle
        cx="206.316"
        cy="109.113"
        r="15.5466"
        transform="rotate(55.5514 206.316 109.113)"
        fill="#D9D9D9"
      />
      <circle
        cx="187.55"
        cy="75.9779"
        r="15.5466"
        transform="rotate(55.5514 187.55 75.9779)"
        fill="#D9D9D9"
      />
      <circle
        cx="225.834"
        cy="64.0656"
        r="15.5466"
        transform="rotate(55.5514 225.834 64.0656)"
        fill="#D9D9D9"
      />
      <circle
        cx="245.073"
        cy="21.6145"
        r="15.5466"
        transform="rotate(55.5514 245.073 21.6145)"
        fill="#D9D9D9"
      />
      <circle
        cx="205.139"
        cy="29.9445"
        r="15.5466"
        transform="rotate(55.5514 205.139 29.9445)"
        fill="#D9D9D9"
      />
      <circle
        cx="166.985"
        cy="42.1254"
        r="15.5466"
        transform="rotate(55.5514 166.985 42.1254)"
        fill="#D9D9D9"
      />
      <circle
        cx="201.843"
        cy="154.16"
        r="15.5466"
        transform="rotate(55.5514 201.843 154.16)"
        fill="#D9D9D9"
      />
      <circle
        cx="172.827"
        cy="125.812"
        r="15.5466"
        transform="rotate(55.5514 172.827 125.812)"
        fill="#D9D9D9"
      />
      <circle
        cx="154.605"
        cy="93.5664"
        r="15.5466"
        transform="rotate(55.5514 154.605 93.5664)"
        fill="#D9D9D9"
      />
      <circle
        cx="135.281"
        cy="59.7136"
        r="15.5466"
        transform="rotate(55.5514 135.281 59.7136)"
        fill="#D9D9D9"
      />
      <circle cx="193.073" cy="212.755" r="15.5466" fill="#D9D9D9" />
      <circle cx="170.152" cy="178.371" r="15.5466" fill="#D9D9D9" />
      <circle cx="146.291" cy="211.399" r="15.5466" fill="#D9D9D9" />
      <circle cx="120.071" cy="180.306" r="15.5466" fill="#D9D9D9" />
      <circle cx="123.469" cy="115.625" r="15.5466" fill="#D9D9D9" />
      <circle cx="76.3306" cy="110.265" r="15.5466" fill="#D9D9D9" />
      <circle cx="54.9602" cy="141.359" r="15.5466" fill="#D9D9D9" />
      <circle cx="143.576" cy="150.082" r="15.5466" fill="#D9D9D9" />
      <circle cx="98.2514" cy="144.478" r="15.5466" fill="#D9D9D9" />
      <circle cx="78.2791" cy="175.774" r="15.5466" fill="#D9D9D9" />
      <circle cx="36.4862" cy="175.774" r="15.5466" fill="#D9D9D9" />
      <circle cx="102.907" cy="213.774" r="15.5466" fill="#D9D9D9" />
      <circle cx="62.7318" cy="213.774" r="15.5466" fill="#D9D9D9" />
      <circle cx="23.8672" cy="212.755" r="15.5466" fill="#D9D9D9" />
      <circle cx="104.673" cy="82.0458" r="15.5466" fill="#D9D9D9" />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 331.464 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 372.516 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 409.742 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 448.846 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 487.949 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 529.001 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 281.527 199.046)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 303.141 165.629)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 281.527 119.595)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 279.15 80.4122)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 261.011 40.1459)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 316.386 87.4984)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 339.049 54.3634)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 300.766 42.451)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 281.527 0)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 321.46 8.32983)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 359.615 20.5107)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 321.909 132.545)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 351.824 106.146)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 381.016 128.519)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 371.994 71.9519)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-0.565666 0.824634 0.824634 0.565666 391.318 38.0991)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 353.099 197.209)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 374.168 162.81)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 396.173 195.26)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 422.204 162.81)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 420.913 99.634)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 441.123 197.209)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 467.782 160.875)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 509.489 158.189)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 490.184 125.081)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 467.782 93.5662)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 442.842 66.9073)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 446.712 129.782)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 480.226 197.209)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 521.277 197.209)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 31.0934 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 72.1453 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 109.372 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 148.475 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 187.578 236.228)"
        fill="#D9D9D9"
      />
      <circle
        cx="15.5466"
        cy="15.5466"
        r="15.5466"
        transform="matrix(-1 0 0 1 228.63 236.228)"
        fill="#D9D9D9"
      />
    </svg>
  );
}
