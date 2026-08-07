import type { ReactNode } from "react";

/** Deja como máximo dos oraciones para tooltips cortos. */
export function clampSummary(summary: string, maxSentences = 2): string {
  const trimmed = summary.trim();
  if (!trimmed) return "";
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts) return trimmed;
  return parts
    .slice(0, maxSentences)
    .map((p) => p.trim())
    .join(" ");
}

type Props = {
  summary: string;
  children: ReactNode;
  className?: string;
};

export function LawTooltip({ summary, children, className = "" }: Props) {
  const tip = clampSummary(summary);
  if (!tip) return <>{children}</>;

  return (
    <span className={`group/law relative inline-block max-w-full ${className}`}>
      <span
        tabIndex={0}
        className="cursor-pointer rounded-sm underline decoration-dotted decoration-celeste-deep/50 underline-offset-[3px] outline-none focus-visible:ring-2 focus-visible:ring-celeste"
      >
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.4rem)] left-0 z-50 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded border border-line bg-navy px-2.5 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/law:opacity-100 group-focus-within/law:opacity-100 dark:bg-paper-elevated dark:text-ink"
      >
        {tip}
      </span>
    </span>
  );
}
