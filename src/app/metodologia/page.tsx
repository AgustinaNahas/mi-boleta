import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodología · mi-boleta",
  description:
    "Cómo construimos mi-boleta: fuentes, matching, leyes curadas, lo que inferimos y los huecos de datos.",
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
          Es un proyecto independiente y sin fines de lucro de Agustina Nahas y
          Azul Damadian. No tiene afiliación oficial con la Cámara de Diputados
          ni con ningún partido. La información se presenta tal cual viene de
          las fuentes, con las transformaciones que documentamos acá. Siempre
          conviene contrastar con el{" "}
          <a
            href="https://votaciones.hcdn.gob.ar"
            className="underline underline-offset-2 hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            acta oficial
          </a>
          : si hay discrepancia, prevalece el acta.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Alcance</h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Cubrimos <strong className="font-semibold text-ink">diputados nacionales</strong>{" "}
          de <strong className="font-semibold text-ink">todas las provincias</strong>, en
          elecciones <strong className="font-semibold text-ink">generales 2019, 2021, 2023 y 2025</strong>.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          La Cámara se renueva <strong className="font-semibold text-ink">por mitades</strong> cada
          dos años (mandatos de cuatro). Quien entró en 2021 aparece al elegir
          las generales 2021, no las de 2023 o 2025. Por eso hay que elegir la
          elección en la que votaste esa boleta.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          No cubrimos Senado, PASO, cargos provinciales o municipales, ni el
          universo completo de votaciones de la Cámara: solo un set curado de
          leyes (ver más abajo).
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Cómo se construye (paso a paso)
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          <li>
            <strong className="font-semibold text-ink">Bajamos votos y nómina.</strong>{" "}
            Desde la API de ArgentinaDatos: actas nominales (2020–2026) y el
            padrón histórico de diputados (nombre, distrito, bloque, mandato,
            foto si existe). Complementamos con la composición actual de la
            HCDN (quién está en la Cámara hoy y con qué mandato).
          </li>
          <li>
            <strong className="font-semibold text-ink">Elegimos leyes a mano.</strong>{" "}
            Armamos un listado editorial (
            <code className="text-ink">featured_laws.json</code>) con título,
            resumen factual, fecha, tipo de votación (general o particular) e
            id de acta. El pipeline recorta los votos a esas actas: no
            procesamos el universo entero.
          </li>
          <li>
            <strong className="font-semibold text-ink">Bajamos las boletas.</strong>{" "}
            Excel oficiales de la Cámara Nacional Electoral (generales 2019,
            2021, 2023 y 2025; 2019 y 2021 vienen en RAR). Tomamos titulares y
            suplentes de diputados nacionales en todos los distritos.
          </li>
          <li>
            <strong className="font-semibold text-ink">Cruzamos “quién entró”.</strong>{" "}
            La CNE no dice quién obtuvo banca. Inferimos electos a partir de
            la composición HCDN (2023 y 2025) o de los mandatos de
            ArgentinaDatos (2019 y 2021), y los matcheamos con la boleta por
            nombre y distrito.
          </li>
          <li>
            <strong className="font-semibold text-ink">La app lee archivos ya procesados.</strong>{" "}
            No hay base de datos en vivo: CSV/JSON versionados. Cada votación
            destacada apunta al PDF del acta en votaciones.hcdn.gob.ar.
          </li>
        </ol>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Fuentes</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          <li>
            <strong className="font-semibold text-ink">Votos nominales:</strong>{" "}
            ArgentinaDatos, actas 2020–2026. El dump CKAN de la HCDN está
            desactualizado y no cubre el período del set curado, así que no lo
            usamos para votos.
          </li>
          <li>
            <strong className="font-semibold text-ink">Nómina y mandatos:</strong>{" "}
            ArgentinaDatos (`/diputados`) + composición actual HCDN
            (datos.hcdn.gob.ar).
          </li>
          <li>
            <strong className="font-semibold text-ink">Listas / boletas:</strong>{" "}
            Excel de candidaturas de la CNE, generales 2019–2025, todas las
            provincias.
          </li>
          <li>
            <strong className="font-semibold text-ink">Actas en PDF:</strong>{" "}
            votaciones.hcdn.gob.ar (enlace de verificación, no es de donde
            parseamos los votos).
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          No usamos resultados de la Dirección Nacional Electoral: con el
          matching actual no hizo falta. Si aparece un distrito o año sin
          cruce, ese sería el plan B.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Quién “entró”: lo que inferimos
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Las listas CNE son candidaturas, no el resultado. Para marcar quiénes
          de una boleta obtuvieron banca hacemos esto:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          <li>
            <strong className="font-semibold text-ink">2019 y 2021:</strong>{" "}
            tomamos mandatos de ArgentinaDatos cuyo inicio cae en diciembre de
            ese año (asunción típica el 10 de diciembre).
          </li>
          <li>
            <strong className="font-semibold text-ink">2023 y 2025:</strong>{" "}
            filtramos la composición actual de la HCDN por el año de mandato.
          </li>
          <li>
            Incluimos <strong className="font-semibold text-ink">titulares y suplentes</strong>{" "}
            del Excel CNE, porque un suplente puede asumir después (renuncia,
            licencia, fin de mandato de otra persona).
          </li>
          <li>
            Si una persona de la Cámara no matchea con nadie de la boleta de
            ese distrito y elección,{" "}
            <strong className="font-semibold text-ink">no inventamos la banca</strong>
            : queda para revisión. Hoy el cruce está completo (con un alias
            manual; ver matching).
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          En la vista de una lista, una votación anterior al inicio de mandato
          de esa persona no cuenta para ella. Si alguien de la lista ya tiene
          banca pero no figura en el acta, la interfaz la cuenta como{" "}
          <strong className="font-semibold text-ink">ausente</strong> (no como
          “no votó a favor ni en contra”). Eso es una convención nuestra, no un
          dato extra del acta.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Matching de nombres
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          La boleta (CNE) y la Cámara (HCDN / ArgentinaDatos) no comparten IDs.
          Cruzamos por nombre normalizado (sin tildes, minúsculas) y distrito.
          A veces el Excel trae un campo “Candidatura” distinto de
          apellido/nombres: usamos ese también.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          El cruce puede ser <strong className="font-semibold text-ink">exacto</strong>,{" "}
          <strong className="font-semibold text-ink">aproximado</strong> (mismo
          apellido y suficiente solapamiento de nombres, con margen respecto
          del segundo candidato) o un{" "}
          <strong className="font-semibold text-ink">alias manual</strong>. Hoy:
          547 exactos, 14 aproximados, 1 alias. Los aproximados pueden errar
          si hay homónimos en el mismo distrito; por eso existe{" "}
          <code className="text-ink">match_review.csv</code> (ahora vacío) y{" "}
          <code className="text-ink">aliases.csv</code>.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Ejemplo de alias: en HCDN figura <em>Olmos, Kelly</em>; en la boleta
          CNE de Fuerza Patria CABA 2025 figura <em>Kismer, Raquel Cecilia</em>.
          Es la misma persona (nombre político vs padrón). Sin el alias no
          habría banca vinculada.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          También unificamos nombres de distrito (“Capital Federal”, “CABA”,
          “Ciudad Autónoma…”) a una etiqueta canónica. Eso es inferencia
          nuestra sobre las variantes oficiales, no un campo de la fuente.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Selección editorial de leyes
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          El set no es el universo de votaciones. Es una curaduría: leyes que
          nos parecieron relevantes para mirar una boleta, con resumen factual
          corto. No hay texto completo del proyecto (no ingestamos Infoleg ni
          el expediente): hay título, bajada editorial y link al acta.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Cobertura actual (62 votaciones): 2020 · 3; 2021 · 1; 2022 · 7; 2023
          · 6; 2024 · 15; 2025 · 15; 2026 · 15. La meta era ~15 por año;
          2020–2023 tienen menos actas nominales en ArgentinaDatos y el set
          refleja ese techo, no una decisión de “esas años no importan”.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Parte del set son votaciones de trámite (apartamientos de reglamento,
          mociones, órdenes del día crudos). En la tabla de una lista, “Leyes
          principales” oculta las que en título o resumen dicen APARTAMIENTO o
          MOCIÓN; “Todas las votaciones” las muestra. Ese filtro es nuestro,
          no viene del acta.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          El recuadro “¿Qué votaron los que voté?” elige hasta 5 leyes a favor
          y 5 en contra según la mayoría de esa lista en cada votación, y
          prioriza temas que marcamos como relevantes (Bases, presupuesto,
          universitario, Garrahan, etc.). Es un recorte editorial automático,
          no un ranking oficial ni un juicio sobre la lista.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Cómo leemos cada voto
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Del acta tomamos el tipo de voto y lo normalizamos a afirmativo,
          negativo, abstención, ausente o presidente. Cualquier otra etiqueta
          queda como “otro” y en la interfaz suele verse como ausente. El
          valor crudo se guarda para auditoría.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          El bloque que mostramos junto a cada diputado es el del mandato
          vigente en la fecha de la ley (ArgentinaDatos). Si no hay mandato
          exactamente en esa fecha, usamos el más cercano anterior. El bloque
          puede no coincidir con la alianza de la boleta: la gente cambia de
          bloque durante el mandato.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Hemiciclo del recinto
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          En la vista por proyecto, el gráfico muestra a quienes figuraban en{" "}
          <strong className="font-semibold text-ink">el acta de esa votación</strong>
          , no la Cámara de hoy. El <strong className="font-semibold text-ink">color</strong>{" "}
          es el voto. La <strong className="font-semibold text-ink">posición</strong> no
          es el asiento nominal: es una aproximación en 8 filas, con pasillo
          central, donde cada bloque forma un gajo de izquierda a derecha. El
          orden izquierda–derecha de los bloques es editorial (inspirado en el
          mapa de bancas de la HCDN), no un score moral ni un plano oficial.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          El hemiciclo del inicio de la home es solo decorativo: se colorea al
          azar y no representa una votación real.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Fotos</h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          Cuando ArgentinaDatos publica una URL de foto, la mostramos. Hoy hay
          foto en 435 de 1157 legisladores del padrón histórico, y en 149 de
          las 257 bancas del recinto actual. Si no hay URL, usamos un
          placeholder. No es un archivo oficial de retratos de la HCDN; la
          cobertura es parcial y puede desactualizarse.
        </p>
      </section>

      <section className="col-span-4 space-y-3 sm:col-span-8 lg:col-span-10 lg:col-start-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Lo que falta o está incompleto
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          <li>
            <strong className="font-semibold text-ink">Pocas leyes 2020–2023</strong>{" "}
            por escasez de actas en ArgentinaDatos (1 a 7 por año vs ~15
            después).
          </li>
          <li>
            <strong className="font-semibold text-ink">Sin texto de la ley:</strong>{" "}
            solo resumen editorial + PDF del acta. No hay articulado ni
            expediente.
          </li>
          <li>
            <strong className="font-semibold text-ink">Fotos incompletas</strong>{" "}
            (sobre todo en mandatos viejos).
          </li>
          <li>
            <strong className="font-semibold text-ink">Sin Senado, PASO ni otros cargos.</strong>
          </li>
          <li>
            <strong className="font-semibold text-ink">Sin resultados DINE:</strong>{" "}
            no validamos bancas contra el escrutinio; confiamos en
            composición/mandatos + matching.
          </li>
          <li>
            <strong className="font-semibold text-ink">Hemiciclo aproximado:</strong>{" "}
            no reprodujimos el plano oficial de bancas.
          </li>
          <li>
            <strong className="font-semibold text-ink">14 matches aproximados</strong>{" "}
            podrían ser homónimos; hay que revisarlos si aparece un caso raro.
          </li>
          <li>
            En algunas listas el inicio de mandato no es el mismo para todos
            (suplentes o asunciones posteriores): por eso la cantidad de
            puntos en la tabla puede cambiar a mitad del período.
          </li>
        </ul>
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
          . Las listas se pueden contrastar con los Excel de candidaturas de la
          CNE. Si hay discrepancia entre mi-boleta y el acta, vale el acta.
        </p>
      </section>
    </article>
  );
}
