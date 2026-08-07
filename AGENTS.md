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
- Próxima fase: candidaturas 2023 (PDF/manual) + pulir matching; luego metodología / más distritos.
- Producto en español; tipografías de marca se definen después.
- Ingest votos: `ingest:download` / `ingest:process`. Listas: `ingest:download-listas` / `ingest:process-listas`.
- Votos recientes: ArgentinaDatos. Listas 2025: Excel CNE. Raw gitignored; processed versionado.
- Revisar mismatches en `data/processed/match_review.csv`.
