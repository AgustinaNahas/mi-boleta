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
| [CNE — Candidaturas 2025 (Excel)](https://www.electoral.gob.ar/nuevo/paginas/datos/candidaturasdatos2025.php) | Listas aprobadas generales 2025 | XLSX | Todas las provincias → `lists.csv`, `candidates.csv` |
| [CNE — Precandidaturas/Candidaturas 2023 (zip→Excel)](https://www.electoral.gob.ar/nuevo/paginas/datos/precandidaturas2023.php) | PASO + Generales 2023 | ZIP/XLSX | Mismo pipeline; generales diputados nacionales |
| [CNE — Candidaturas 2021 (RAR)](https://www.electoral.gob.ar/nuevo/paginas/datos/candidaturasdatos2021.php) | Generales 2021 | RAR→XLSX | Requiere `unrar` |
| [CNE — Candidaturas 2019 (RAR)](https://www.electoral.gob.ar/nuevo/paginas/datos/candidaturasdatos.php) | Generales 2019 | RAR→XLSX | Requiere `unrar` |
| HCDN composición (mandatos 2023–27 / 2025–29) | Quién entró (cohortes recientes) | CSV | Cruce por nombre → `seats.csv` |
| ArgentinaDatos mandatos | Electos 2019/2021 + bloque histórico | JSON | Match listas 2019/2021; `legislator_mandates.csv` |
| [Tribunal Electoral CABA — candidatos 2025](https://electoralcaba.gob.ar/lista-de-candidatos-2025/) | HTML de referencia | HTML | Guardado en raw; el process usa el Excel CNE |
| ArgentinaDatos `foto` en `/diputados` | URL de retrato | JSON API | Columna `foto` en `legislators.csv` / boleta / votos |

**Match (nacional):** 2019/2021 100% contra mandatos ArgDatos; 2023 100% (130/130); 2025 100% (127/127), con titulares + suplentes CNE. Aliases en `aliases.csv`.

### Processed versionados (listas)

- `elections.csv`, `districts.csv`, `lists.csv`, `candidates.csv`
- `candidates_with_seats.csv` — boleta + flag `elected`
- `seats.csv` — candidate ↔ legislator + `match_confidence`
- `aliases.csv` — correcciones manuales electo HCDN → `candidate_id` CNE
- `match_review.csv` — **para revisar** (mismatches)

### Comandos

```bash
npm run ingest:download
npm run ingest:process
npm run ingest:download-listas          # + --force
npm run ingest:process-listas
```

## Planificadas

### Dirección Nacional Electoral — resultados

- Apoyo para bancas por agrupación si el cruce nombre↔lista no alcanza.

### Más distritos / provincias

- Hecho para listas CNE 2019–2025 (todas las provincias). Queda pulir mismatches puntuales.

### Fotos de diputados

- En uso: campo `foto` de ArgentinaDatos (`api.argentinadatos.com/static/diputados/...`). Cobertura parcial; placeholder si falta.

### Eje espacial / hemiciclo por votaciones

- Hecho: hemiciclo por ley desde el acta (`chamber_by_law.json`); documentado en `/metodologia/`.

## Matching de nombres

Boleta (CNE) y HCDN no comparten IDs. Fase 2: nombre normalizado + distrito; a veces el Excel trae `Candidatura` distinta de `Apellido`/`Nombres` (se usa `Candidatura` para match). Si el nombre político no coincide con el padrón (p. ej. Kelly Olmos vs Raquel Kismer), se carga un alias en `aliases.csv`. Casos sin match → `match_review.csv` sin inventar bancas.

## Nota temporal

- Votos API: 2020–2026 (cobertura densa desde 2024; 2020–2023 con pocas actas en ArgentinaDatos).
- Listas estructuradas oficiales en pipeline: **2019, 2021, 2023 y 2025** (todas las provincias).
- CKAN HCDN votos: histórico stale (no cubre 2019+ útil para el set curado).
- Hemiciclo por ley: nómina del acta + bloque del mandato en esa fecha (`chamber_by_law.json`).
