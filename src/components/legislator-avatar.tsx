type Props = {
  name: string;
  foto?: string;
  voteDotClass?: string | null;
};

/** Avatar circular: foto oficial si hay, si no placeholder gris. */
export function LegislatorAvatar({ name, foto, voteDotClass }: Props) {
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0">
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
          className={`absolute bottom-0 left-0 z-10 h-3 w-3 rounded-full ${voteDotClass}`}
          aria-hidden
        />
      ) : null}
      <span className="sr-only">{name}</span>
    </span>
  );
}
