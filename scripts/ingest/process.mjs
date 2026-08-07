#!/usr/bin/env node
/**
 * Lee data/raw + featured_laws.json y escribe processed:
 * - legislators.csv
 * - votes_featured.csv
 * - actas_index.json (cabeceras útiles p/ debug)
 */
import fs from "node:fs";
import path from "node:path";
import {
  nameKeyFromDisplay,
  nameKeyFromParts,
  normalizeName,
  normalizeVote,
  processedDir,
  rawDir,
  readJson,
  slugify,
  writeCsv,
  writeJson,
} from "./lib.mjs";

const FEATURED_LAWS_PATH = path.join(processedDir, "featured_laws.json");

function loadArgDatosActas() {
  const dir = path.join(rawDir, "argentinadatos");
  if (!fs.existsSync(dir)) return [];
  const byId = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!/^actas-\d{4}\.json$/.test(file)) continue;
    const data = readJson(path.join(dir, file));
    if (!Array.isArray(data)) continue;
    for (const acta of data) {
      if (acta?.id != null) byId.set(String(acta.id), acta);
    }
  }
  return [...byId.values()];
}

function loadArgDatosDiputados() {
  const p = path.join(rawDir, "argentinadatos", "diputados.json");
  if (!fs.existsSync(p)) return [];
  const data = readJson(p);
  return Array.isArray(data) ? data : [];
}

function parseHcdnCompositionCsv(text) {
  // Simple CSV parse for quoted fields
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) =>
    h.replaceAll('"', "").trim().toUpperCase(),
  );
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line).map((c) => c.replaceAll('"', "").trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadHcdnComposition() {
  const csvPath = path.join(rawDir, "hcdn", "composicion-actual.csv");
  if (!fs.existsSync(csvPath)) return [];
  return parseHcdnCompositionCsv(fs.readFileSync(csvPath, "utf8"));
}

function districtCanonical(value) {
  const n = normalizeName(value);
  if (!n) return "";
  if (n.includes("ciudad") || n === "caba" || n === "capital federal") {
    return "CABA";
  }
  if (n === "buenos aires" || n === "provincia de buenos aires") {
    return "Buenos Aires";
  }
  // Title-ish from original when possible
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildLegislatorIndex(argDiputados, hcdnRows) {
  /** @type {Map<string, object>} */
  const byKey = new Map();

  for (const d of argDiputados) {
    const key = nameKeyFromParts(d.apellido, d.nombre);
    if (!key) continue;
    const id = d.id || `arg-${slugify(d.apellido, d.nombre)}`;
    const existing = byKey.get(key);
    const fin = d.periodoMandato?.fin ?? "";
    const candidate = {
      id,
      nombre: `${d.apellido}, ${d.nombre}`.replace(/\s+/g, " ").trim(),
      distrito: districtCanonical(d.provincia),
      source: "argentinadatos",
      mandato_fin: fin,
    };
    if (!existing) {
      byKey.set(key, candidate);
    } else {
      // Prefer more recent mandate
      if (fin > (existing.mandato_fin ?? "")) {
        byKey.set(key, { ...candidate, id: existing.id.startsWith("HCDN") ? existing.id : candidate.id });
      }
    }
  }

  for (const row of hcdnRows) {
    const apellido = row.APELLIDO ?? "";
    const nombre = row.NOMBRE ?? "";
    const key = nameKeyFromParts(apellido, nombre);
    if (!key) continue;
    const display = `${apellido}, ${nombre}`.replace(/\s+/g, " ").trim();
    const distrito = districtCanonical(row.DISTRITO);
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.distrito && distrito) existing.distrito = distrito;
      existing.source =
        existing.source === "argentinadatos"
          ? "argentinadatos+hcdn"
          : existing.source;
    } else {
      byKey.set(key, {
        id: `hcdn-${slugify(apellido, nombre)}`,
        nombre: display,
        distrito,
        source: "hcdn",
        mandato_fin: "",
      });
    }
  }

  return byKey;
}

function ensureLegislator(byKey, displayName, distritoHint = "") {
  const key = nameKeyFromDisplay(displayName);
  if (!key) return null;
  let leg = byKey.get(key);
  if (!leg) {
    leg = {
      id: `vote-${slugify(displayName)}`,
      nombre: displayName.trim(),
      distrito: districtCanonical(distritoHint),
      source: "votes",
      mandato_fin: "",
    };
    byKey.set(key, leg);
  } else if (!leg.distrito && distritoHint) {
    leg.distrito = districtCanonical(distritoHint);
  }
  return leg;
}

function assetIdFromImagen(url) {
  if (!url) return "";
  const m = String(url).match(/\/diputados\/([^/?#]+)/i);
  return m ? m[1] : "";
}

function main() {
  console.log("[ingest:process] start");

  if (!fs.existsSync(FEATURED_LAWS_PATH)) {
    throw new Error(`Falta ${FEATURED_LAWS_PATH}`);
  }
  const featuredLaws = readJson(FEATURED_LAWS_PATH);
  if (!Array.isArray(featuredLaws) || featuredLaws.length === 0) {
    throw new Error("featured_laws.json vacío");
  }

  const actas = loadArgDatosActas();
  const actasById = new Map(actas.map((a) => [String(a.id), a]));
  console.log(`  actas ArgDatos: ${actas.length}`);

  const argDiputados = loadArgDatosDiputados();
  const hcdnComposition = loadHcdnComposition();
  console.log(
    `  diputados ArgDatos: ${argDiputados.length}; HCDN composición: ${hcdnComposition.length}`,
  );

  const byKey = buildLegislatorIndex(argDiputados, hcdnComposition);

  const voteRows = [];
  const missingActas = [];

  for (const law of featuredLaws) {
    const actaId = String(law.actaId ?? "");
    const acta = actasById.get(actaId);
    if (!acta) {
      missingActas.push(actaId);
      console.warn(`  WARNING: no se encontró acta ${actaId} (${law.id})`);
      continue;
    }
    const votos = Array.isArray(acta.votos) ? acta.votos : [];
    for (const v of votos) {
      const display = String(v.diputado ?? "").trim();
      if (!display) continue;
      const leg = ensureLegislator(byKey, display);
      if (!leg) continue;
      const votoRaw = String(v.tipoVoto ?? "").trim();
      voteRows.push({
        legislator_id: leg.id,
        law_id: law.id,
        acta_id: actaId,
        legislador: leg.nombre,
        distrito: leg.distrito,
        voto: normalizeVote(votoRaw),
        voto_raw: votoRaw,
        hcdn_asset_id: assetIdFromImagen(v.imagen),
      });
    }
  }

  const legislators = [...byKey.values()]
    .map(({ id, nombre, distrito, source }) => ({
      id,
      nombre,
      distrito,
      source,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  writeCsv(
    path.join(processedDir, "legislators.csv"),
    ["id", "nombre", "distrito", "source"],
    legislators,
  );

  writeCsv(
    path.join(processedDir, "votes_featured.csv"),
    [
      "legislator_id",
      "law_id",
      "acta_id",
      "legislador",
      "distrito",
      "voto",
      "voto_raw",
      "hcdn_asset_id",
    ],
    voteRows,
  );

  // Índice liviano de actas (sin votos) para inspección
  writeJson(
    path.join(processedDir, "actas_index.json"),
    actas
      .map((a) => ({
        id: String(a.id),
        date: String(a.fecha ?? "").slice(0, 10),
        title: a.titulo,
        result: a.resultado,
        afirmativos: a.votosAfirmativos,
        negativos: a.votosNegativos,
        abstenciones: a.abstenciones,
        ausentes: a.ausentes,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  );

  const summary = {
    processedAt: new Date().toISOString(),
    featuredLaws: featuredLaws.length,
    legislators: legislators.length,
    votesFeatured: voteRows.length,
    missingActas,
  };
  writeJson(path.join(processedDir, "ingest_summary.json"), summary);

  console.log(
    `[ingest:process] legislators=${legislators.length} votes=${voteRows.length} missingActas=${missingActas.length}`,
  );
  if (missingActas.length) {
    process.exitCode = 1;
  }
}

main();
