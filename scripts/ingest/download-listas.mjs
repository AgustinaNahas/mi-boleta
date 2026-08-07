#!/usr/bin/env node
/**
 * Descarga candidaturas oficiales (CNE) a data/raw/cne/.
 * Uso: node scripts/ingest/download-listas.mjs [--force]
 *
 * Nota 2023: el Excel también puede copiarse a mano a
 * data/raw/cne/candidaturas-2023.xlsx (desde el zip DESCARGAR de la CNE).
 */
import path from "node:path";
import fs from "node:fs";
import {
  downloadFile,
  ensureDir,
  parseArgs,
  rawDir,
  writeJson,
} from "./lib.mjs";

const CNE_XLSX_2025 =
  "https://www.electoral.gob.ar/nuevo/paginas/datos/2025%20Candidaturas%20Listas%20Presentadas%20a%20la%20Justicia%20y%20Aprobadas%20al%2014-10-2025%2013hs.xlsx";

const CNE_ZIP_2023 =
  "https://www.electoral.gob.ar/nuevo/paginas/datos/Precandidaturas%202023.zip";

const CABA_TRIBUNAL_2025 =
  "https://electoralcaba.gob.ar/lista-de-candidatos-2025/";

async function downloadAndExtract2023(outDir, force) {
  const xlsxDest = path.join(outDir, "candidaturas-2023.xlsx");
  if (!force && fs.existsSync(xlsxDest) && fs.statSync(xlsxDest).size > 0) {
    console.log(`  cache hit: data/raw/cne/candidaturas-2023.xlsx`);
    return {
      id: "cne-candidaturas-2023-xlsx",
      url: CNE_ZIP_2023,
      path: "data/raw/cne/candidaturas-2023.xlsx",
      note: "Extraído del zip oficial CNE (Precandidaturas 2023.zip)",
      cached: true,
    };
  }

  const zipPath = path.join(outDir, "Precandidaturas-2023.zip");
  await downloadFile(CNE_ZIP_2023, zipPath, { force: true });

  // unzip via node:adm? use unzip CLI
  const { spawnSync } = await import("node:child_process");
  const tmpDir = path.join(outDir, "_tmp2023");
  ensureDir(tmpDir);
  const unzip = spawnSync("unzip", ["-o", zipPath, "-d", tmpDir], {
    encoding: "utf8",
  });
  if (unzip.status !== 0) {
    throw new Error(`unzip falló: ${unzip.stderr || unzip.stdout}`);
  }
  const found = fs
    .readdirSync(tmpDir)
    .find((f) => f.toLowerCase().endsWith(".xlsx"));
  if (!found) throw new Error("No hay xlsx dentro del zip 2023");
  fs.copyFileSync(path.join(tmpDir, found), xlsxDest);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`  wrote data/raw/cne/candidaturas-2023.xlsx`);
  return {
    id: "cne-candidaturas-2023-xlsx",
    url: CNE_ZIP_2023,
    path: "data/raw/cne/candidaturas-2023.xlsx",
    note: "Extraído del zip oficial CNE (Precandidaturas 2023.zip)",
  };
}

async function main() {
  const { force } = parseArgs();
  const outDir = path.join(rawDir, "cne");
  ensureDir(outDir);
  console.log(`[ingest:download-listas] force=${force}`);

  const sources = [];

  sources.push(await downloadAndExtract2023(outDir, force));

  await downloadFile(
    CNE_XLSX_2025,
    path.join(outDir, "candidaturas-2025.xlsx"),
    { force },
  );
  sources.push({
    id: "cne-candidaturas-2025-xlsx",
    url: CNE_XLSX_2025,
    path: "data/raw/cne/candidaturas-2025.xlsx",
    note: "Listas presentadas/aprobadas generales 2025 (oficial CNE)",
  });

  await downloadFile(
    CABA_TRIBUNAL_2025,
    path.join(outDir, "candidaturas-2025-caba-tribunal.html"),
    { force },
  );
  sources.push({
    id: "tribunal-caba-candidatos-2025",
    url: CABA_TRIBUNAL_2025,
    path: "data/raw/cne/candidaturas-2025-caba-tribunal.html",
    note: "HTML de referencia (Tribunal Electoral CABA); el process usa el Excel CNE",
  });

  writeJson(path.join(outDir, "download-listas-manifest.json"), {
    downloadedAt: new Date().toISOString(),
    force,
    sources,
  });

  console.log("[ingest:download-listas] listo");
}

main().catch((err) => {
  console.error("[ingest:download-listas] error:", err);
  process.exit(1);
});
