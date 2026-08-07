# Fuentes de datos

Inventario de orígenes que usa (o usará) mi-boleta. Cuando una fuente entre al pipeline, se anota acá el archivo processed y la fecha de descarga.

Última descarga de votos: `data/raw/download-manifest.json` (gitignored).  
Última descarga de listas: `data/raw/cne/download-listas-manifest.json` (gitignored).

## En uso

### Votos y legisladores (Fase 1)

| Fuente | Qué aporta | Formato | Processed / notas |
| --- | --- | --- | --- |
| [ArgentinaDatos `/v1/diputados/actas/{año}`](https://argentinadatos.com/) | Cabeceras + votos nominales (2020–2026) | JSON API | `votes_featured.csv`, `actas_index.json`. Fuente usable p/ período reciente (CKAN HCDN está stale) |
| [ArgentinaDatos `/v1/diputados/diputados`](https://argentinadatos.com/docs/operations/get-diputados-diputados) | Nómina histórica | JSON API | `legislators.csv` |
| [HCDN — Composición actual](https://datos.hcdn.gob.ar/dataset/legisladores) | Quién está en la Cámara + mandato | CSV / JSON | Electos para `seats.csv` + distrito |
| [HCDN — Votaciones Nominales](https://datos.hcdn.gob.ar/dataset/votaciones_nominales) | Dump CSV histórico | CSV CKAN | Archivo; no cubre 2024–2025 |
| `featured_laws.json` | 15 leyes curadas | JSON local | Selección editorial |

### Listas / boletas (Fase 2)

| Fuente | Qué aporta | Formato | Processed / notas |
| --- | --- | --- | --- |
| [CNE — Candidaturas 2025 (Excel)](https://www.electoral.gob.ar/nuevo/paginas/datos/candidaturasdatos2025.php) | Listas aprobadas generales 2025 | XLSX | Piloto CABA + BA → `lists.csv`, `candidates.csv` |
| [CNE — Precandidaturas/Candidaturas 2023 (zip→Excel)](https://www.electoral.gob.ar/nuevo/paginas/datos/precandidaturas2023.php) | PASO + Generales 2023 | ZIP/XLSX | Mismo pipeline; generales diputados piloto |
| [Tribunal Electoral CABA — candidatos 2025](https://electoralcaba.gob.ar/lista-de-candidatos-2025/) | HTML de referencia | HTML | Guardado en raw; el process usa el Excel CNE |
| HCDN composición (mandatos 2023–27 / 2025–29) | Quién entró | CSV | Cruce por nombre → `seats.csv` |

**Match:** 2023 piloto 100% (47/47); 2025 ~98% (queda `Olmos, Kelly` en `match_review.csv`).

### Processed versionados (listas)

- `elections.csv`, `districts.csv`, `lists.csv`, `candidates.csv`
- `candidates_with_seats.csv` — boleta + flag `elected`
- `seats.csv` — candidate ↔ legislator + `match_confidence`
- `aliases.csv` — correcciones manuales
- `match_review.csv` — **para revisar** (mismatches)

### Comandos

```bash
npm run ingest:download
npm run ingest:process
npm run ingest:download-listas          # + --force
npm run ingest:process-listas
```

## Planificadas

### Cámara Nacional Electoral — candidaturas 2023

- Hace falta PDF/Excel por distrito (CABA + BA) o carga manual a `candidates.csv`.

### Dirección Nacional Electoral — resultados

- Apoyo para bancas por agrupación si el cruce nombre↔lista no alcanza.

## Matching de nombres

Boleta (CNE) y HCDN no comparten IDs. Fase 2: nombre normalizado + distrito; a veces el Excel trae `Candidatura` distinta de `Apellido`/`Nombres` (se usa `Candidatura` para match). Casos sin match → `match_review.csv` sin inventar bancas.

## Nota temporal

- Votos API: 2020–2026.
- Listas estructuradas oficiales en pipeline: **2025** (piloto).
- CKAN HCDN votos: histórico stale.
