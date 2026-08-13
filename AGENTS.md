<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# mi-boleta — notas del agente

- Path del repo: `/home/agus/dev/mi-boleta`
- **No crear commits** salvo pedido explícito del usuario (ella commitea siempre).
- Datos: `data/raw/` gitignored; `data/processed/` versionado.
- Deploy: GitHub Pages → `output: "export"`. Para Pages usar `NEXT_PUBLIC_BASE_PATH=/mi-boleta`.
- Node: preferir nvm 22 (`source ~/.nvm/nvm.sh && nvm use 22`).
- Plan unificado: resumen en `README.md`; sprint desagregado en `SPRINT_PLAN.md` (P0/P1/P2). Kickoff histórico en `.cursor/plans/`.
- Matching nacional 2019–2025; mismatches → `aliases.csv` / `match_review.csv`.
- Fotos: columna `foto` desde ArgentinaDatos cuando existe.
- Hemiciclo por ley desde el acta (`chamber_by_law.json`); hero decorativo.
- Listas CNE: 2019, 2021, 2023, 2025 (`unrar` para 2019/2021).
- Producto en español; tipografía actual del rediseño: Inter.
- Ingest votos: `ingest:download` / `ingest:process`. Listas: `ingest:download-listas` / `ingest:process-listas`.
- Votos recientes: ArgentinaDatos. Listas: Excel/RAR CNE (todas las provincias). Raw gitignored; processed versionado.
- Revisar mismatches en `data/processed/match_review.csv`.
- Metodología pública en `/metodologia/`.
