# mi-boleta

Elegí la lista que votaste (Diputados nacionales, Argentina), mirá quiénes de esa boleta obtuvieron banca, y cómo votaron en un set curado de leyes relevantes.

Sin score ideológico: hechos públicos + una selección editorial explícita de leyes.

## Estado

**Fase 2 (listas + electos).** Piloto CABA/BA con **generales 2023 y 2025** desde Excel oficial CNE: `/elegir` muestra alianza → boleta → quién entró → votos (filtrados por mandato).

Fase 1 (votos + 15 leyes) sigue en la home.

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

- `data/processed/featured_laws.json` — 15 leyes curadas (selección editorial)
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
