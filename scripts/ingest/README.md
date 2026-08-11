# Ingest

Scripts que bajan fuentes a `data/raw/` y escriben CSVs/JSON en `data/processed/`.

```bash
npm run ingest:download          # votos (cache; --force)
npm run ingest:process
npm run ingest:download-listas   # candidaturas CNE
npm run ingest:process-listas
npm run ingest                   # solo votos download+process
```

## Fuentes

- Votos: ArgentinaDatos actas + HCDN composición (ver `FUENTES.md`).
- Listas 2019, 2021, 2023 y 2025 (todas las provincias): Excel/RAR CNE oficial (titulares + suplentes; 2019/2021 requieren `unrar`).
- Mandatos históricos: `legislator_mandates.csv`; hemiciclo por ley: `chamber_by_law.json`.
- Fotos: campo `foto` de ArgentinaDatos → `legislators.csv` / boleta / votos.
- Aliases manuales electo → candidato: `data/processed/aliases.csv`.
