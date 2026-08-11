/**
 * Helpers compartidos del ingest.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "../..");
export const rawDir = path.join(repoRoot, "data", "raw");
export const processedDir = path.join(repoRoot, "data", "processed");

export const USER_AGENT =
  "mi-boleta/0.1 (local data ingest; https://github.com/AgustinaNahas/mi-boleta)";

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text, "utf8");
}

export function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  writeText(filePath, lines.join("\n") + "\n");
}

/** Quita acentos, baja a minúsculas, colapsa espacios y puntuación. */
export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** "Apellido, Nombre" o "Nombre Apellido" → clave estable. */
export function nameKeyFromParts(apellido, nombre) {
  return normalizeName(`${apellido} ${nombre}`);
}

export function nameKeyFromDisplay(display) {
  const raw = String(display ?? "").trim();
  if (raw.includes(",")) {
    const [apellido, ...rest] = raw.split(",");
    return nameKeyFromParts(apellido, rest.join(" "));
  }
  return normalizeName(raw);
}

export function slugify(...parts) {
  return normalizeName(parts.filter(Boolean).join(" ")).replace(/\s+/g, "-");
}

/** Mapa de variantes oficiales → nombre canónico de distrito. */
const DISTRICT_ALIASES = new Map([
  ["caba", "CABA"],
  ["capital federal", "CABA"],
  ["ciudad de buenos aires", "CABA"],
  ["ciudad autonoma de buenos aires", "CABA"],
  ["buenos aires", "Buenos Aires"],
  ["provincia de buenos aires", "Buenos Aires"],
  ["catamarca", "Catamarca"],
  ["chaco", "Chaco"],
  ["chubut", "Chubut"],
  ["cordoba", "Córdoba"],
  ["corrientes", "Corrientes"],
  ["entre rios", "Entre Ríos"],
  ["formosa", "Formosa"],
  ["jujuy", "Jujuy"],
  ["la pampa", "La Pampa"],
  ["la rioja", "La Rioja"],
  ["mendoza", "Mendoza"],
  ["misiones", "Misiones"],
  ["neuquen", "Neuquén"],
  ["rio negro", "Río Negro"],
  ["salta", "Salta"],
  ["san juan", "San Juan"],
  ["san luis", "San Luis"],
  ["santa cruz", "Santa Cruz"],
  ["santa fe", "Santa Fe"],
  ["santiago del estero", "Santiago del Estero"],
  ["s del estero", "Santiago del Estero"],
  ["tierra del fuego", "Tierra del Fuego"],
  ["t del fuego", "Tierra del Fuego"],
  ["tierra del fuego antartida e islas del atlantico sur", "Tierra del Fuego"],
  ["tucuman", "Tucumán"],
]);

export function districtCanonical(value) {
  const n = normalizeName(value);
  if (!n) return "";
  if (DISTRICT_ALIASES.has(n)) return DISTRICT_ALIASES.get(n);
  // Title-case fallback for unexpected labels
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeVote(raw) {
  const n = normalizeName(raw).replace(/\s+/g, "");
  if (n === "afirmativo") return "AFIRMATIVO";
  if (n === "negativo") return "NEGATIVO";
  if (n === "abstencion") return "ABSTENCION";
  if (n === "ausente" || n === "ausentes") return "AUSENTE";
  if (n === "presidente") return "PRESIDENTE";
  return "OTRO";
}

export function parseArgs(argv = process.argv.slice(2)) {
  return {
    force: argv.includes("--force"),
  };
}

export async function downloadFile(url, destPath, { force = false } = {}) {
  ensureDir(path.dirname(destPath));
  if (!force && fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    console.log(`  cache hit: ${path.relative(repoRoot, destPath)}`);
    return { cached: true, destPath };
  }

  console.log(`  downloading: ${url}`);
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "*/*" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  console.log(
    `  wrote ${path.relative(repoRoot, destPath)} (${buf.length} bytes)`,
  );
  return { cached: false, destPath };
}
