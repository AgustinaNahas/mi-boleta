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
- Listas 2025: Excel CNE oficial. 2023: pendiente PDF/manual.
