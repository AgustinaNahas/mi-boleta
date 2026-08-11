import type { SVGProps } from "react";

/** Marca mínima del Figma: círculos rojo/verde superpuestos. */
export function BrandMark({
  className,
  title = "mi-boleta",
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 40 28"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <title>{title}</title>
      <circle cx="14" cy="14" r="12" fill="#f04438" />
      <circle cx="26" cy="14" r="12" fill="#12b76a" fillOpacity="0.92" />
    </svg>
  );
}
