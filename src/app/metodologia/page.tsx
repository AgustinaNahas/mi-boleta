import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodología · mi-boleta",
  description:
    "Cómo construimos mi-boleta: fuentes, matching, selección editorial de leyes y límites del piloto.",
};

export default function MetodologiaPage() {
  return (
    <article className="cols gap-y-12 pt-4 sm:pt-8">
      <header className="col-span-4 space-y-4 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Metodología
        </h1>
        <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
          mi-boleta muestra hechos públicos: qué lista votaste, quiénes de esa
          boleta obtuvieron banca, y cómo votaron en un set curado de leyes.
          No asignamos un “score ideológico” ni un ranking moral.
        </p>
      </header>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Qué es (y qué no)
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Es un proyecto independiente y sin fines de lucro. No tiene
          afiliación oficial con la Cámara de Diputados ni con ningún partido.
          La información se presenta tal cual viene de las fuentes; siempre
          conviene contrastar con el{" "}
          <a
            href="https://votaciones.hcdn.gob.ar"
            className="underline underline-offset-2 hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            acta oficial
          </a>
          .
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Fuentes</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          <li>
            <strong className="font-semibold text-ink">Votos y nómina:</strong>{" "}
            API de ArgentinaDatos (actas y diputados) y composición actual de
            la HCDN.
          </li>
          <li>
            <strong className="font-semibold text-ink">Listas / boletas:</strong>{" "}
            Excel oficiales de la Cámara Nacional Electoral (generales 2023 y
            2025), filtrados al piloto.
          </li>
          <li>
            Detalle técnico del inventario en el repositorio (
            <code className="text-ink">FUENTES.md</code>).
          </li>
        </ul>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Flujo: boleta → banca → voto
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          <li>Elegís distrito, elección y lista (alianza / agrupación).</li>
          <li>
            Mostramos la boleta de titulares y marcamos quiénes entraron según
            la composición de la Cámara.
          </li>
          <li>
            Para quienes tienen banca vinculada, mostramos votos solo en leyes
            cuya fecha es igual o posterior al inicio de su mandato.
          </li>
        </ol>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Matching de nombres
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          La boleta (CNE) y la Cámara (HCDN) no comparten IDs. Cruçamos por
          nombre normalizado y distrito, incluyendo{" "}
          <strong className="font-semibold text-ink">titulares y suplentes</strong>{" "}
          del Excel CNE (así cubrimos reemplazos que asumen después). Si el
          nombre político no coincide con el padrón, usamos aliases manuales en{" "}
          <code className="text-ink">aliases.csv</code>.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Ejemplo: en HCDN figura <em>Olmos, Kelly</em>; en la boleta CNE de
          Fuerza Patria CABA 2025 figura <em>Kismer, Raquel Cecilia</em> (es
          la misma persona). Ese caso se resuelve con un alias explícito, no
          inventando una banca.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Los casos sin match quedan en{" "}
          <code className="text-ink">match_review.csv</code> para revisión.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Selección editorial de leyes
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          El set de leyes destacadas es una curaduría editorial: no es el
          universo completo de votaciones. La meta es ~15 por año en 2020–2026;
          2020–2023 tienen menos actas en ArgentinaDatos y el set refleja ese
          tope. Cada ítem tiene título, resumen factual, fecha, tipo de
          votación (general / particular) y enlace al acta cuando está
          disponible. Está versionado en{" "}
          <code className="text-ink">featured_laws.json</code>.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Alcance del piloto
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Cubrimos diputados nacionales de{" "}
          <strong className="font-semibold text-ink">todas las provincias</strong>
          , en elecciones generales{" "}
          <strong className="font-semibold text-ink">2019, 2021, 2023 y 2025</strong>
          . El matching boleta↔Cámara no es perfecto: los casos sin cruce quedan
          en <code className="text-ink">match_review.csv</code>.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Hemiciclo del recinto
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          En “Buscar por proyecto”, el gráfico del recinto muestra a quienes
          figuraban en el acta de esa votación (no la Cámara de hoy). La{" "}
          <strong className="font-semibold text-ink">posición</strong> es una
          aproximación en 8 filas: cada bloque forma un “gajo” de izquierda a
          derecha (como el mapa de bancas), no una fila entera. El criterio de
          orden es editorial (no es el asiento nominal ni un score moral). El{" "}
          <strong className="font-semibold text-ink">color</strong> refleja el
          voto en el proyecto seleccionado. El hemiciclo del hero es solo
          decorativo. La cobertura de actas en ArgentinaDatos es densa desde
          2024; 2020–2023 tienen menos actas disponibles y el set curado refleja
          ese tope.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Fotos</h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Cuando ArgentinaDatos publica una URL de foto para el legislador, la
          mostramos en la interfaz (origen: imágenes servidas por esa API a
          partir de material parlamentario). Si no hay foto, usamos un
          placeholder.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Cómo verificar
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Cada votación destacada apunta al PDF del acta en{" "}
          <a
            href="https://votaciones.hcdn.gob.ar"
            className="underline underline-offset-2 hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            votaciones.hcdn.gob.ar
          </a>
          . Si hay discrepancia, prevalece el acta oficial.
        </p>
      </section>
    </article>
  );
}
