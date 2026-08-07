#!/usr/bin/env node
/**
 * Descarga fuentes a data/raw/.
 * Uso: node scripts/ingest/download.mjs [--force]
 */
import path from "node:path";
import {
  downloadFile,
  ensureDir,
  parseArgs,
  rawDir,
  writeJson,
} from "./lib.mjs";

const HCDN_VOTACIONES_PACKAGE =
  "https://datos.hcdn.gob.ar/api/3/action/package_show?id=votaciones_nominales";
const HCDN_LEGISLADORES_PACKAGE =
  "https://datos.hcdn.gob.ar/api/3/action/package_show?id=legisladores";

const ARGDATOS_DIPUTADOS =
  "https://api.argentinadatos.com/v1/diputados/diputados";

/** Años con actas en ArgentinaDatos (probe 2026-08). */
const ARGDATOS_ACTA_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

function pickResources(packageJson, predicate) {
  return (packageJson.result?.resources ?? []).filter(predicate);
}

async function fetchPackage(url, destPath, force) {
  await downloadFile(url, destPath, { force });
  return JSON.parse(await import("node:fs").then((fs) =>
    fs.promises.readFile(destPath, "utf8"),
  ));
}

async function main() {
  const { force } = parseArgs();
  ensureDir(rawDir);

  const downloadedAt = new Date().toISOString();
  console.log(`[ingest:download] force=${force}`);

  const meta = {
    downloadedAt,
    force,
    sources: [],
  };

  // --- HCDN: metadata + CSV dumps (históricos; CKAN está desactualizado p/ recientes) ---
  const hcdnVotesMetaPath = path.join(rawDir, "hcdn", "votaciones_nominales.package.json");
  const hcdnVotesPkg = await fetchPackage(
    HCDN_VOTACIONES_PACKAGE,
    hcdnVotesMetaPath,
    force,
  );
  meta.sources.push({
    id: "hcdn-votaciones-package",
    url: HCDN_VOTACIONES_PACKAGE,
    path: "data/raw/hcdn/votaciones_nominales.package.json",
  });

  const hcdnCsvs = pickResources(
    hcdnVotesPkg,
    (r) =>
      r.format?.toUpperCase() === "CSV" &&
      /129\s*A\s*137|per[ií]odo\s*137/i.test(r.name ?? ""),
  );
  for (const resource of hcdnCsvs) {
    const safeName = (resource.name ?? resource.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const dest = path.join(rawDir, "hcdn", `${safeName}.csv`);
    await downloadFile(resource.url, dest, { force });
    meta.sources.push({
      id: resource.id,
      name: resource.name,
      url: resource.url,
      path: `data/raw/hcdn/${safeName}.csv`,
    });
  }

  const hcdnLegsMetaPath = path.join(rawDir, "hcdn", "legisladores.package.json");
  const hcdnLegsPkg = await fetchPackage(
    HCDN_LEGISLADORES_PACKAGE,
    hcdnLegsMetaPath,
    force,
  );
  meta.sources.push({
    id: "hcdn-legisladores-package",
    url: HCDN_LEGISLADORES_PACKAGE,
    path: "data/raw/hcdn/legisladores.package.json",
  });

  const composition = pickResources(
    hcdnLegsPkg,
    (r) =>
      /composici[oó]n actual/i.test(r.name ?? "") ||
      /diputados1\.9\.csv$/i.test(r.url ?? ""),
  );
  for (const resource of composition) {
    const ext = (resource.format ?? "csv").toLowerCase();
    const dest = path.join(rawDir, "hcdn", `composicion-actual.${ext}`);
    await downloadFile(resource.url, dest, { force });
    meta.sources.push({
      id: resource.id,
      name: resource.name,
      url: resource.url,
      path: `data/raw/hcdn/composicion-actual.${ext}`,
    });
  }

  // --- ArgentinaDatos: diputados + actas por año (fuente usable p/ 2020+) ---
  const diputadosPath = path.join(rawDir, "argentinadatos", "diputados.json");
  await downloadFile(ARGDATOS_DIPUTADOS, diputadosPath, { force });
  meta.sources.push({
    id: "argentinadatos-diputados",
    url: ARGDATOS_DIPUTADOS,
    path: "data/raw/argentinadatos/diputados.json",
  });

  for (const year of ARGDATOS_ACTA_YEARS) {
    const url = `https://api.argentinadatos.com/v1/diputados/actas/${year}`;
    const dest = path.join(rawDir, "argentinadatos", `actas-${year}.json`);
    try {
      await downloadFile(url, dest, { force });
      meta.sources.push({
        id: `argentinadatos-actas-${year}`,
        url,
        path: `data/raw/argentinadatos/actas-${year}.json`,
      });
    } catch (err) {
      console.warn(`  skip ${year}: ${err.message}`);
    }
  }

  writeJson(path.join(rawDir, "download-manifest.json"), meta);
  console.log(`[ingest:download] listo. Manifest → data/raw/download-manifest.json`);
}

main().catch((err) => {
  console.error("[ingest:download] error:", err);
  process.exit(1);
});
