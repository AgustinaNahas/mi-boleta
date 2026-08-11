# mi-boleta

Elegí la lista que votaste (Diputados nacionales, Argentina), mirá quiénes de esa boleta obtuvieron banca, y cómo votaron en un set curado de leyes relevantes.

Sin score ideológico: hechos públicos + una selección editorial explícita de leyes.

## Estado

**Producto usable.** Diputados nacionales, generales **2019–2025**, **todas las provincias**: elegís lista → quiénes entraron → votos en leyes curadas. Fotos vía ArgentinaDatos cuando existen. Metodología en `/metodologia/`.

## Planificación (unificada)

Origen: plan inicial (fases 0–4 del kickoff) + backlog de diseño/datos de este ciclo.

### Hecho

| Fase original | Qué era | Estado |
| --- | --- | --- |
| **0** Setup | Next + `data/` + Pages estático, sin DB | Hecho |
| **1** Pipeline de votos | ArgentinaDatos/HCDN → `legislators` + `votes_featured` + leyes curadas | Hecho |
| **2** Listas y electos | CNE → boletas + matching HCDN (+ `aliases.csv`) | Hecho (país completo) |
| **3** Producto ciudadano | Wizard + home + metodología | Hecho (UI rediseñada, Inter) |
| — | Más provincias (no solo CABA/BA) | Hecho |
| — | Fotos de diputados (URL ArgentinaDatos) | Hecho (cobertura parcial) |

### Pendiente

- [x] Pulir `match_review.csv` — resuelto al incluir **suplentes** CNE en el ingest (antes solo titulares)
- [x] Gráfico tipo **cámara (hemiciclo)** por ley (nómina del acta; posición por bloque de entonces; color = voto)
- [x] Listas CNE **2019 y 2021** (renovación por mitades) además de 2023/2025
- [x] Ampliar set de leyes / actas (meta ~15/año 2020–2026; 2020–2023 limitados por cobertura ArgDatos)
- [ ] Apoyo DINE / resultados si el cruce nombre↔lista no alcanza
- [ ] Extensiones del plan original: Senado, votaciones “divididas” automáticas, comparar listas

### Nota de alcance (importante)

La Cámara se renueva **por mitades**. Un diputado con mandato **2021–2025** aparece al elegir generales **2021** (y no en 2023/2025). mi-boleta carga boletas CNE de **2019, 2021, 2023 y 2025**.

Detalle de fuentes en [FUENTES.md](./FUENTES.md).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Datos locales: CSV / JSON (sin base de datos)
- PapaParse para CSV
- Deploy: **GitHub Pages** (`output: "export"`)

## Estructura

```
data/
  raw/           # descargas oficiales (gitignored)
  processed/     # lo que consume la app (versionado)
scripts/ingest/  # pipelines download → processed
src/
  app/           # páginas
  components/    # UI
  lib/data.ts    # lectura de processed/
```

## Desarrollo

Node 22+ recomendado (nvm).

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

Otros scripts:

```bash
npm run ingest                 # votos: download + process
npm run ingest:download-listas
npm run ingest:process-listas
npm run lint
npm run format
npm run build
```

Para build como en GitHub Pages (base path `/mi-boleta`):

```bash
npm run build:pages
```

## Datos

- `data/processed/featured_laws.json` — leyes curadas (~15/año 2024–2026; menos en 2020–2023 por cobertura de actas)
- `data/processed/chamber_by_law.json` — hemiciclo por ley (nómina del acta)
- `data/processed/legislators.csv` — diputados (id, nombre, distrito)
- `data/processed/votes_featured.csv` — votos de esas leyes (`voto` + `voto_raw`)
- `data/processed/example_votes.csv` — demo vieja de Fase 0 (ya no se muestra en home)

Schema de cada ley en `featured_laws.json`:

```json
{
  "id": "ley-bases-sancion-2024",
  "title": "Ley Bases (sanción definitiva)",
  "summary": "Una o dos oraciones factuales.",
  "date": "2024-06-28",
  "sourceUrl": "https://votaciones.hcdn.gob.ar/pdf/acta/5272",
  "actaId": "5272",
  "period": "142",
  "voteType": "general"
}
```

Detalle de cada fuente oficial: ver [FUENTES.md](./FUENTES.md).

## Deploy (GitHub Pages)

El workflow [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) buildea con `NEXT_PUBLIC_BASE_PATH=/mi-boleta` y publica `out/`.

En el repo: Settings → Pages → Source: **GitHub Actions**.

## Commits

Los commits los hace quien mantiene el repo; el agente no commitea solo.
