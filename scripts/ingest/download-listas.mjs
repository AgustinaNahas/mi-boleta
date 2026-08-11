#!/usr/bin/env node
/**
 * Descarga candidaturas oficiales (CNE) a data/raw/cne/.
 * Uso: node scripts/ingest/download-listas.mjs [--force]
 *
 * Nota 2023: el Excel también puede copiarse a mano a
 * data/raw/cne/candidaturas-2023.xlsx (desde el zip DESCARGAR de la CNE).
 * 2019/2021: RAR oficiales → xlsx vía `unrar`.
 */
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
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

const CNE_RAR_2021 =
  "https://www.electoral.gob.ar/nuevo/paginas/datos/candidaturas2021.rar";

const CNE_RAR_2019 =
  "https://www.electoral.gob.ar/nuevo/paginas/datos/candidaturas2019.rar";

const CABA_TRIBUNAL_2025 =
  "https://electoralcaba.gob.ar/lista-de-candidatos-2025/";

function findXlsxRecursive(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...findXlsxRecursive(p));
    else if (name.toLowerCase().endsWith(".xlsx")) out.push(p);
  }
  return out;
}

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

async function downloadAndExtractRar(outDir, { year, url, force }) {
  const xlsxDest = path.join(outDir, `candidaturas-${year}.xlsx`);
  if (!force && fs.existsSync(xlsxDest) && fs.statSync(xlsxDest).size > 0) {
    console.log(`  cache hit: data/raw/cne/candidaturas-${year}.xlsx`);
    return {
      id: `cne-candidaturas-${year}-xlsx`,
      url,
      path: `data/raw/cne/candidaturas-${year}.xlsx`,
      note: `Extraído del RAR oficial CNE (candidaturas${year}.rar); requiere unrar`,
      cached: true,
    };
  }

  const rarPath = path.join(outDir, `candidaturas${year}.rar`);
  await downloadFile(url, rarPath, { force: true });

  const tmpDir = path.join(outDir, `_tmp${year}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  ensureDir(tmpDir);
  const unrar = spawnSync("unrar", ["x", "-o+", rarPath, tmpDir + path.sep], {
    encoding: "utf8",
  });
  if (unrar.status !== 0) {
    throw new Error(
      `unrar falló (${year}): ${unrar.stderr || unrar.stdout || "sin salida"}. Instalá unrar.`,
    );
  }
  const found = findXlsxRecursive(tmpDir);
  if (!found.length) {
    throw new Error(`No hay xlsx dentro del RAR ${year}`);
  }
  // Prefer file with "candidat" in name; else largest
  found.sort((a, b) => {
    const score = (p) =>
      (/candidat/i.test(path.basename(p)) ? 10 : 0) + fs.statSync(p).size / 1e9;
    return score(b) - score(a);
  });
  fs.copyFileSync(found[0], xlsxDest);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`  wrote data/raw/cne/candidaturas-${year}.xlsx`);
  return {
    id: `cne-candidaturas-${year}-xlsx`,
    url,
    path: `data/raw/cne/candidaturas-${year}.xlsx`,
    note: `Extraído del RAR oficial CNE (candidaturas${year}.rar); requiere unrar`,
  };
}

async function main() {
  const { force } = parseArgs();
  const outDir = path.join(rawDir, "cne");
  ensureDir(outDir);
  console.log(`[ingest:download-listas] force=${force}`);

  const sources = [];

  sources.push(
    await downloadAndExtractRar(outDir, {
      year: "2019",
      url: CNE_RAR_2019,
      force,
    }),
  );
  sources.push(
    await downloadAndExtractRar(outDir, {
      year: "2021",
      url: CNE_RAR_2021,
      force,
    }),
  );
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
