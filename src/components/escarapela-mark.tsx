import type { SVGProps } from "react";

/** Escarapela inspirada en la identidad Bicentenario 2010 (formas cíclicas + sol central). */
export function EscarapelaMark({
  className,
  title = "Escarapela",
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <title>{title}</title>
      {/* Anillo exterior — azul */}
      <circle cx="60" cy="60" r="54" fill="#1a6fad" />
      <g fill="#74acdf">
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i * 36 - 90) * Math.PI) / 180;
          const x = 60 + Math.cos(a) * 48;
          const y = 60 + Math.sin(a) * 48;
          return <circle key={`o-${i}`} cx={x} cy={y} r="11" />;
        })}
      </g>
      {/* Anillo medio — celeste */}
      <circle cx="60" cy="60" r="40" fill="#74acdf" />
      <g fill="#ffffff">
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i * 36 - 72) * Math.PI) / 180;
          const x = 60 + Math.cos(a) * 34;
          const y = 60 + Math.sin(a) * 34;
          return <circle key={`m-${i}`} cx={x} cy={y} r="8.5" />;
        })}
      </g>
      {/* Anillo interior — blanco */}
      <circle cx="60" cy="60" r="26" fill="#ffffff" />
      {/* Sol central — plano */}
      <circle cx="60" cy="60" r="18" fill="#f6b40e" />
      <g fill="#f6b40e">
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i * 36 - 90) * Math.PI) / 180;
          const x = 60 + Math.cos(a) * 20;
          const y = 60 + Math.sin(a) * 20;
          return <circle key={`s-${i}`} cx={x} cy={y} r="4.5" />;
        })}
      </g>
      <circle cx="60" cy="60" r="14" fill="#f6b40e" />
    </svg>
  );
}
