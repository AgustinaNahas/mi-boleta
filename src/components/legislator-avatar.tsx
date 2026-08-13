type Props = {
  name: string;
  foto?: string;
  voteDotClass?: string | null;
  /** Tamaño del avatar; por defecto sm (listas). */
  size?: "sm" | "lg";
};

const SIZE_CLASS = {
  sm: "h-11 w-11",
  lg: "h-28 w-28 sm:h-32 sm:w-32",
} as const;

/** Avatar circular: foto oficial si hay, si no placeholder gris. */
export function LegislatorAvatar({
  name,
  foto,
  voteDotClass,
  size = "sm",
}: Props) {
  return (
    <span className={`relative inline-flex shrink-0 ${SIZE_CLASS[size]}`}>
      <span className="h-full w-full overflow-hidden rounded-full bg-[#d9d9d9]">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs externas (ArgentinaDatos); export estático
          <img
            src={foto}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </span>
      {voteDotClass ? (
        <span
          className={`absolute bottom-0 left-0 z-10 rounded-full ${
            size === "lg" ? "h-4 w-4" : "h-3 w-3"
          } ${voteDotClass}`}
          aria-hidden
        />
      ) : null}
      <span className="sr-only">{name}</span>
    </span>
  );
}
