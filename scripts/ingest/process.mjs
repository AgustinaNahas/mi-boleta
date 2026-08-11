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
  districtCanonical,
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

function buildLegislatorIndex(argDiputados, hcdnRows) {
  /** @type {Map<string, object>} */
  const byKey = new Map();
  /** Última foto conocida por id HCDN / ArgDatos. */
  const fotoById = new Map();
  for (const d of argDiputados) {
    if (!d?.id || !d?.foto) continue;
    const fin = d.periodoMandato?.fin ?? "";
    const prev = fotoById.get(d.id);
    if (!prev || fin > prev.fin) {
      fotoById.set(d.id, { foto: String(d.foto), fin });
    }
  }

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
      foto: fotoById.get(id)?.foto ?? d.foto ?? "",
    };
    if (!existing) {
      byKey.set(key, candidate);
    } else {
      // Prefer more recent mandate
      if (fin > (existing.mandato_fin ?? "")) {
        byKey.set(key, {
          ...candidate,
          id: existing.id.startsWith("HCDN") ? existing.id : candidate.id,
          foto:
            fotoById.get(
              existing.id.startsWith("HCDN") ? existing.id : candidate.id,
            )?.foto ??
            candidate.foto ??
            existing.foto ??
            "",
        });
      } else if (!existing.foto && candidate.foto) {
        existing.foto = candidate.foto;
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
      if (!existing.foto && fotoById.get(existing.id)?.foto) {
        existing.foto = fotoById.get(existing.id).foto;
      }
    } else {
      const id = `hcdn-${slugify(apellido, nombre)}`;
      byKey.set(key, {
        id,
        nombre: display,
        distrito,
        source: "hcdn",
        mandato_fin: "",
        foto: fotoById.get(id)?.foto ?? "",
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

/**
 * Orden editorial izquierda → derecha (nombres históricos y actuales).
 * Matching por inclusión normalizada; no es un score moral.
 */
const BLOCK_ORDER_LEFT_TO_RIGHT = [
  // Izquierda / FIT
  "PTS-FRENTE DE IZQUIERDA",
  "PTS",
  "PARTIDO OBRERO EN EL FRENTE DE IZQUIERDA",
  "PARTIDO OBRERO",
  "FRENTE DE IZQUIERDA",
  "FIT",
  // Peronismo / UxP / FdT
  "FRENTE DE TODOS",
  "UNIÓN POR LA PATRIA",
  "UNION POR LA PATRIA",
  "FRENTE PARA LA VICTORIA",
  "PARTIDO JUSTICIALISTA",
  // Centro
  "ENCUENTRO FEDERAL",
  "SOCIALISTA",
  "GEN",
  "COALICIÓN CÍVICA",
  "COALICION CIVICA",
  "UCR - UNIÓN CÍVICA RADICAL",
  "UNIÓN CÍVICA RADICAL",
  "UNION CIVICA RADICAL",
  "UCR",
  "JUNTOS POR EL CAMBIO",
  "EVOLUCIÓN",
  "EVOLUCION",
  "PROVINCIAS UNIDAS",
  "INNOVACIÓN FEDERAL",
  "INNOVACION FEDERAL",
  "PRODUCCION Y TRABAJO",
  "ELIJO CATAMARCA",
  "INDEPENDENCIA",
  "POR SANTA CRUZ",
  "LA NEUQUINIDAD",
  "DEFENDAMOS CÓRDOBA",
  "DEFENDAMOS",
  "ADELANTE BUENOS AIRES",
  "ADELANTE",
  "PRIMERO SAN LUIS",
  "COHERENCIA",
  "MID - MOVIMIENTO DE INTEGRACIÓN Y DESARROLLO",
  "MID",
  "PRO",
  // Derecha / LLA
  "LA LIBERTAD AVANZA",
  "LIBERTAD AVANZA",
];

/** Grupos del mapa HCDN actual (solo snapshot “hoy”). */
const CHART_GROUP_MEMBERS = {
  UXP: ["UNIÓN POR LA PATRIA"],
  LLA: ["LA LIBERTAD AVANZA"],
  FDC: [
    "PRO",
    "UCR - UNIÓN CÍVICA RADICAL",
    "ENCUENTRO FEDERAL",
    "MID - MOVIMIENTO DE INTEGRACIÓN Y DESARROLLO",
  ],
  UNIDOS: ["PROVINCIAS UNIDAS", "POR SANTA CRUZ", "ADELANTE BUENOS AIRES"],
  IF: ["INNOVACIÓN FEDERAL"],
  ELIJO: ["ELIJO CATAMARCA"],
  IND: ["INDEPENDENCIA"],
  PYT: ["PRODUCCION Y TRABAJO"],
  CC: ["COALICION CIVICA"],
  PO: ["PARTIDO OBRERO EN EL FRENTE DE IZQUIERDA Y DE TRABAJADORES-UNIDAD"],
  PTS: ["PTS-FRENTE DE IZQUIERDA Y DE TRABAJADORES UNIDAD"],
  PSL: ["PRIMERO SAN LUIS"],
  LN: ["LA NEUQUINIDAD"],
  DC: ["DEFENDAMOS CÓRDOBA"],
  COH: ["COHERENCIA"],
};

function dateOnly(value) {
  return String(value ?? "").slice(0, 10);
}

function blockSortKey(bloque) {
  const n = normalizeName(bloque);
  if (!n) return BLOCK_ORDER_LEFT_TO_RIGHT.length + 1;
  // Preferir la aguja más larga para no confundir PRO ⊂ PROVINCIAS, FEDERAL ⊂ INNOVACIÓN FEDERAL, etc.
  let bestIdx = -1;
  let bestLen = -1;
  for (let i = 0; i < BLOCK_ORDER_LEFT_TO_RIGHT.length; i++) {
    const needle = normalizeName(BLOCK_ORDER_LEFT_TO_RIGHT[i]);
    if (!needle) continue;
    const hit =
      n === needle ||
      n.startsWith(`${needle} `) ||
      n.endsWith(` ${needle}`) ||
      n.includes(` ${needle} `) ||
      (needle.length >= 4 && n.includes(needle)) ||
      (n.length >= 4 && needle.includes(n));
    if (!hit) continue;
    if (needle.length > bestLen) {
      bestLen = needle.length;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return bestIdx;
  return BLOCK_ORDER_LEFT_TO_RIGHT.length + n.charCodeAt(0) / 1000;
}

function cleanPersonPart(value) {
  return String(value ?? "")
    .replace(/["“”']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Índice de mandatos ArgDatos: por id y por nameKey. */
function buildMandatesIndex(argDiputados) {
  /** @type {Map<string, object[]>} */
  const byId = new Map();
  /** @type {Map<string, object[]>} */
  const byKey = new Map();
  for (const d of argDiputados) {
    if (!d) continue;
    const inicio = dateOnly(d.periodoMandato?.inicio);
    const fin = dateOnly(d.ceseFecha || d.periodoMandato?.fin);
    const row = {
      id: d.id || "",
      apellido: d.apellido ?? "",
      nombre: d.nombre ?? "",
      display: `${d.apellido}, ${d.nombre}`.replace(/\s+/g, " ").trim(),
      distrito: districtCanonical(d.provincia),
      bloque: String(d.bloque ?? "").trim(),
      inicio,
      fin,
      foto: d.foto ? String(d.foto) : "",
    };
    if (row.id) {
      if (!byId.has(row.id)) byId.set(row.id, []);
      byId.get(row.id).push(row);
    }
    const key = nameKeyFromParts(d.apellido, d.nombre);
    if (key) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(row);
    }
  }
  for (const list of byId.values()) {
    list.sort((a, b) => a.inicio.localeCompare(b.inicio));
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => a.inicio.localeCompare(b.inicio));
  }
  return { byId, byKey };
}

function mandateOnDate(list, date) {
  if (!list?.length) return null;
  const d = dateOnly(date);
  if (!d) return list[list.length - 1];
  const active = list.filter((m) => {
    if (m.inicio && m.inicio > d) return false;
    if (m.fin && m.fin < d) return false;
    return true;
  });
  if (active.length) return active[active.length - 1];
  // Más cercano por inicio ≤ d
  const past = list.filter((m) => !m.inicio || m.inicio <= d);
  if (past.length) return past[past.length - 1];
  return list[0];
}

function lookupMandate(mandatesIndex, legislatorId, displayName, date) {
  if (legislatorId && mandatesIndex.byId.has(legislatorId)) {
    return mandateOnDate(mandatesIndex.byId.get(legislatorId), date);
  }
  const key = nameKeyFromDisplay(displayName);
  if (key && mandatesIndex.byKey.has(key)) {
    return mandateOnDate(mandatesIndex.byKey.get(key), date);
  }
  return null;
}

/** Geometría: N bancas en 8 filas con pasillo central. Cada slot tiene t∈[0,1] izq→der. */
function hemicycleSeatSlotsForCount(total) {
  const weights = [14, 18, 24, 30, 36, 40, 46, 48];
  const radii = [36, 48, 60, 72, 84, 96, 108, 120];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let counts = weights.map((w) =>
    Math.max(total >= 8 ? 1 : 0, Math.round((total * w) / weightSum)),
  );
  let sum = counts.reduce((a, b) => a + b, 0);
  while (sum > total) {
    for (let i = counts.length - 1; i >= 0 && sum > total; i--) {
      if (counts[i] > 1) {
        counts[i] -= 1;
        sum -= 1;
      }
    }
    if (sum > total && counts.every((c) => c <= 1)) {
      for (let i = counts.length - 1; i >= 0 && sum > total; i--) {
        if (counts[i] > 0) {
          counts[i] -= 1;
          sum -= 1;
        }
      }
    }
  }
  while (sum < total) {
    counts[counts.length - 1] += 1;
    sum += 1;
  }

  const cx = 140;
  const cy = 136;
  const aisle = 0.1;
  const leftStart = Math.PI - 0.04;
  const rightEnd = 0.04;
  const slots = [];
  let seatNum = 0;

  function pushSeat(angle, radius, row) {
    const t = (Math.PI - angle) / Math.PI; // 0 izquierda → 1 derecha
    slots.push({
      x: Number((cx + Math.cos(angle) * radius).toFixed(2)),
      y: Number((cy - Math.sin(angle) * radius).toFixed(2)),
      seat_num: seatNum++,
      row,
      t: Number(t.toFixed(4)),
    });
  }

  for (let r = 0; r < counts.length; r++) {
    const n = counts[r];
    if (n <= 0) continue;
    const radius = radii[r];
    const leftN = Math.floor(n / 2);
    const rightN = n - leftN;
    const leftEnd = Math.PI / 2 + aisle / 2;
    const rightStart = Math.PI / 2 - aisle / 2;
    for (let i = 0; i < leftN; i++) {
      const u = leftN === 1 ? 0.5 : i / (leftN - 1);
      pushSeat(leftStart + (leftEnd - leftStart) * u, radius, r + 1);
    }
    for (let i = 0; i < rightN; i++) {
      const u = rightN === 1 ? 0.5 : i / (rightN - 1);
      pushSeat(rightStart + (rightEnd - rightStart) * u, radius, r + 1);
    }
  }
  return { slots, viewBox: "0 0 280 155", rowCounts: counts };
}

/** Reparte `n` asientos entre pesos con método del resto mayor. */
function allocateByWeights(n, weights) {
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  const ideal = weights.map((w) => (n * w) / sumW);
  const floors = ideal.map((v) => Math.floor(v));
  let rem = n - floors.reduce((a, b) => a + b, 0);
  const order = ideal
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < rem; k++) out[order[k % order.length].i] += 1;
  return out;
}

/**
 * Layout en “gajos”: cada bloque ocupa un sector izq→der en TODAS las filas
 * (como el mapa HCDN), no filas enteras consecutivas.
 */
function layoutChamberMembers(members, extra = {}) {
  const byBloc = new Map();
  for (const m of members) {
    const b = (m.bloque || m.chart_group || "Sin bloque").trim() || "Sin bloque";
    if (!byBloc.has(b)) byBloc.set(b, []);
    byBloc.get(b).push({ ...m, bloque: b });
  }
  for (const list of byBloc.values()) {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
  const blocNames = [...byBloc.keys()].sort(
    (a, b) => blockSortKey(a) - blockSortKey(b),
  );
  const pools = blocNames.map((b) => [...byBloc.get(b)]);
  const weights = pools.map((p) => p.length);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  // Centro ideal de cada bloque en [0,1] para recolocar sobras
  const blocIdealT = [];
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    const start = acc / totalWeight;
    acc += weights[i];
    const end = acc / totalWeight;
    blocIdealT.push((start + end) / 2);
  }

  const { slots, viewBox } = hemicycleSeatSlotsForCount(members.length);
  /** @type {(object|null)[]} */
  const placed = new Array(slots.length).fill(null);
  const byRow = new Map();
  for (const slot of slots) {
    if (!byRow.has(slot.row)) byRow.set(slot.row, []);
    byRow.get(slot.row).push(slot);
  }

  for (const row of [...byRow.keys()].sort((a, b) => a - b)) {
    const rowSlots = byRow.get(row).sort((a, b) => a.t - b.t);
    const counts = allocateByWeights(rowSlots.length, weights);
    let slotIdx = 0;
    for (let bi = 0; bi < blocNames.length; bi++) {
      for (let k = 0; k < counts[bi]; k++) {
        const slot = rowSlots[slotIdx++];
        if (!slot) break;
        if (pools[bi].length) {
          placed[slot.seat_num] = pools[bi].shift();
        }
        // si el pool está vacío, dejamos el slot para el segundo pase
      }
    }
  }

  const leftover = pools.flat();
  leftover.sort((a, b) => {
    const bk = blockSortKey(a.bloque) - blockSortKey(b.bloque);
    if (bk !== 0) return bk;
    return a.nombre.localeCompare(b.nombre, "es");
  });
  const emptySlots = slots
    .filter((s) => !placed[s.seat_num])
    .sort((a, b) => a.t - b.t);

  for (const slot of emptySlots) {
    if (!leftover.length) break;
    // Elegir el sobrante cuyo bloque ideal está más cerca del t del asiento
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < leftover.length; i++) {
      const bi = blocNames.indexOf(leftover[i].bloque);
      const ideal = bi >= 0 ? blocIdealT[bi] : 0.5;
      const d = Math.abs(ideal - slot.t);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    placed[slot.seat_num] = leftover.splice(best, 1)[0];
  }

  const seats = slots
    .map((slot) => {
      const member = placed[slot.seat_num];
      if (!member) return null;
      return {
        ...member,
        chart_group: member.chart_group || member.bloque,
        seat_index: slot.seat_num,
        row: slot.row,
        x: slot.x,
        y: slot.y,
      };
    })
    .filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    viewBox,
    layout: "8-rows-wedges-by-bloque",
    ...extra,
    seats,
  };
}

/** Orden de bancas del mapa HCDN actual (257). */
function chartSeatGroups() {
  const rows = [
    [...Array(7).fill("UXP"), ...Array(2).fill("PYT"), ...Array(5).fill("LLA")],
    [...Array(8).fill("UXP"), ...Array(2).fill("FDC"), ...Array(8).fill("LLA")],
    [...Array(10).fill("UXP"), ...Array(4).fill("FDC"), ...Array(10).fill("LLA")],
    [...Array(12).fill("UXP"), ...Array(6).fill("FDC"), ...Array(12).fill("LLA")],
    [
      ...Array(14).fill("UXP"),
      "CC",
      ...Array(7).fill("FDC"),
      "IF",
      ...Array(13).fill("LLA"),
    ],
    [
      ...Array(13).fill("UXP"),
      "PSL",
      "LN",
      "DC",
      "COH",
      ...Array(3).fill("ELIJO"),
      ...Array(2).fill("UNIDOS"),
      ...Array(2).fill("FDC"),
      "IF",
      ...Array(15).fill("LLA"),
    ],
    [
      ...Array(14).fill("UXP"),
      "CC",
      ...Array(2).fill("PTS"),
      ...Array(2).fill("PO"),
      ...Array(8).fill("UNIDOS"),
      "FDC",
      ...Array(2).fill("IF"),
      ...Array(16).fill("LLA"),
    ],
    [
      ...Array(15).fill("UXP"),
      ...Array(10).fill("UNIDOS"),
      ...Array(3).fill("IND"),
      ...Array(5).fill("IF"),
      ...Array(15).fill("LLA"),
    ],
  ];
  return ["LLA", ...rows.flat()];
}

function hemicycleSeatSlotsOfficial() {
  // Snapshot actual: banca 0 + 8 filas = 257
  const rowCounts = [14, 18, 24, 30, 36, 40, 46, 48];
  const radii = [36, 48, 60, 72, 84, 96, 108, 120];
  const cx = 140;
  const cy = 136;
  const aisle = 0.1;
  const leftStart = Math.PI - 0.04;
  const rightEnd = 0.04;
  const slots = [
    { x: cx, y: cy + 4, seat_num: 0, row: 0 },
  ];
  let seatNum = 1;
  for (let r = 0; r < rowCounts.length; r++) {
    const n = rowCounts[r];
    const radius = radii[r];
    const leftN = Math.floor(n / 2);
    const rightN = n - leftN;
    const leftEnd = Math.PI / 2 + aisle / 2;
    const rightStart = Math.PI / 2 - aisle / 2;
    for (let i = 0; i < leftN; i++) {
      const t = leftN === 1 ? 0.5 : i / (leftN - 1);
      const angle = leftStart + (leftEnd - leftStart) * t;
      slots.push({
        x: Number((cx + Math.cos(angle) * radius).toFixed(2)),
        y: Number((cy - Math.sin(angle) * radius).toFixed(2)),
        seat_num: seatNum++,
        row: r + 1,
      });
    }
    for (let i = 0; i < rightN; i++) {
      const t = rightN === 1 ? 0.5 : i / (rightN - 1);
      const angle = rightStart + (rightEnd - rightStart) * t;
      slots.push({
        x: Number((cx + Math.cos(angle) * radius).toFixed(2)),
        y: Number((cy - Math.sin(angle) * radius).toFixed(2)),
        seat_num: seatNum++,
        row: r + 1,
      });
    }
  }
  return { slots, viewBox: "0 0 280 155" };
}

function buildMemberPools(members) {
  const byBloc = new Map();
  for (const m of members) {
    const b = m.bloque;
    if (!byBloc.has(b)) byBloc.set(b, []);
    byBloc.get(b).push(m);
  }
  for (const list of byBloc.values()) {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
  const pools = {};
  const usedBlocs = new Set();
  for (const [group, blocs] of Object.entries(CHART_GROUP_MEMBERS)) {
    const pool = [];
    for (const bloc of blocs) {
      pool.push(...(byBloc.get(bloc) ?? []));
      usedBlocs.add(bloc);
    }
    pools[group] = pool;
  }
  const leftover = [];
  for (const [bloc, list] of byBloc.entries()) {
    if (!usedBlocs.has(bloc)) leftover.push(...list);
  }
  pools._OTHER = leftover;
  return pools;
}

function takeFromPool(pools, group) {
  const primary = pools[group];
  if (primary?.length) return primary.shift();
  if (pools._OTHER?.length) return pools._OTHER.shift();
  for (const key of Object.keys(pools)) {
    if (pools[key].length) return pools[key].shift();
  }
  return null;
}

function buildChamberSeats(hcdnRows, byKey) {
  const members = hcdnRows.map((row) => {
    const apellido = cleanPersonPart(row.APELLIDO);
    const nombre = cleanPersonPart(row.NOMBRE);
    const display = `${apellido}, ${nombre}`.replace(/\s+/g, " ").trim();
    let legislator =
      byKey.get(nameKeyFromParts(apellido, nombre)) ||
      byKey.get(nameKeyFromDisplay(display));
    if (!legislator) {
      const nombrePlain = nombre
        .replace(/\([^)]*\)/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      legislator = byKey.get(nameKeyFromParts(apellido, nombrePlain));
    }
    return {
      legislator_id: legislator?.id ?? "",
      nombre: legislator?.nombre || display,
      distrito: districtCanonical(row.DISTRITO),
      bloque: String(row.BLOQUE ?? "").trim(),
      mandato: String(row.MANDATO ?? "").trim(),
      foto: legislator?.foto ?? "",
    };
  });

  if (members.length !== 257) {
    return layoutChamberMembers(members, {
      layout: "8-rows-by-bloque",
      note: "fallback: composición ≠ 257",
    });
  }

  const groups = chartSeatGroups();
  const { slots, viewBox } = hemicycleSeatSlotsOfficial();
  const pools = buildMemberPools(members);
  const seats = [];
  for (let i = 0; i < groups.length; i++) {
    const member = takeFromPool(pools, groups[i]);
    if (!member) {
      throw new Error(`hemiciclo: sin legislador para banca ${i} (${groups[i]})`);
    }
    seats.push({
      ...member,
      chart_group: groups[i],
      seat_index: slots[i].seat_num,
      row: slots[i].row,
      x: slots[i].x,
      y: slots[i].y,
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    viewBox,
    layout: "hcdn-8-rows-approx",
    chartGroups: Object.keys(CHART_GROUP_MEMBERS),
    seats,
  };
}

function buildChamberByLaw(featuredLaws, voteRows, mandatesIndex) {
  /** @type {Record<string, object>} */
  const out = {};
  for (const law of featuredLaws) {
    const votes = voteRows.filter((v) => v.law_id === law.id);
    const members = votes.map((v) => {
      const m = lookupMandate(
        mandatesIndex,
        v.legislator_id,
        v.legislador,
        law.date,
      );
      const bloque = m?.bloque || v.bloque || "";
      return {
        legislator_id: v.legislator_id,
        nombre: v.legislador,
        distrito: v.distrito || m?.distrito || "",
        bloque,
        mandato:
          m?.inicio && m?.fin
            ? `${m.inicio.slice(0, 4)}-${m.fin.slice(0, 4)}`
            : "",
        foto: v.foto || m?.foto || "",
        chart_group: bloque || "Sin bloque",
      };
    });
    out[law.id] = layoutChamberMembers(members, {
      lawId: law.id,
      lawDate: law.date ?? "",
    });
  }
  return out;
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
  const mandatesIndex = buildMandatesIndex(argDiputados);

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
      const mandate = lookupMandate(
        mandatesIndex,
        leg.id,
        leg.nombre,
        law.date || acta.fecha,
      );
      voteRows.push({
        legislator_id: leg.id,
        law_id: law.id,
        acta_id: actaId,
        legislador: leg.nombre,
        distrito: leg.distrito || mandate?.distrito || "",
        bloque: mandate?.bloque ?? "",
        voto: normalizeVote(votoRaw),
        voto_raw: votoRaw,
        hcdn_asset_id: assetIdFromImagen(v.imagen),
        foto: leg.foto || mandate?.foto || "",
      });
    }
  }

  const legislators = [...byKey.values()]
    .map(({ id, nombre, distrito, source, foto }) => ({
      id,
      nombre,
      distrito,
      source,
      foto: foto ?? "",
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const mandateRows = [];
  for (const list of mandatesIndex.byId.values()) {
    for (const m of list) {
      mandateRows.push({
        legislator_id: m.id,
        nombre: m.display,
        distrito: m.distrito,
        bloque: m.bloque,
        mandato_inicio: m.inicio,
        mandato_fin: m.fin,
        foto: m.foto,
      });
    }
  }
  mandateRows.sort((a, b) => {
    const n = a.nombre.localeCompare(b.nombre, "es");
    if (n !== 0) return n;
    return a.mandato_inicio.localeCompare(b.mandato_inicio);
  });

  writeCsv(
    path.join(processedDir, "legislators.csv"),
    ["id", "nombre", "distrito", "source", "foto"],
    legislators,
  );

  writeCsv(
    path.join(processedDir, "legislator_mandates.csv"),
    [
      "legislator_id",
      "nombre",
      "distrito",
      "bloque",
      "mandato_inicio",
      "mandato_fin",
      "foto",
    ],
    mandateRows,
  );

  writeCsv(
    path.join(processedDir, "votes_featured.csv"),
    [
      "legislator_id",
      "law_id",
      "acta_id",
      "legislador",
      "distrito",
      "bloque",
      "voto",
      "voto_raw",
      "hcdn_asset_id",
      "foto",
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

  const chamber = buildChamberSeats(hcdnComposition, byKey);
  writeJson(path.join(processedDir, "chamber_seats.json"), chamber);

  const chamberByLaw = buildChamberByLaw(
    featuredLaws,
    voteRows,
    mandatesIndex,
  );
  writeJson(path.join(processedDir, "chamber_by_law.json"), chamberByLaw);

  const summary = {
    processedAt: new Date().toISOString(),
    featuredLaws: featuredLaws.length,
    legislators: legislators.length,
    legislatorMandates: mandateRows.length,
    votesFeatured: voteRows.length,
    chamberSeats: chamber.seats.length,
    chamberLinked: chamber.seats.filter((s) => s.legislator_id).length,
    chamberByLaw: Object.keys(chamberByLaw).length,
    missingActas,
  };
  writeJson(path.join(processedDir, "ingest_summary.json"), summary);

  console.log(
    `[ingest:process] legislators=${legislators.length} mandates=${mandateRows.length} votes=${voteRows.length} chamber=${chamber.seats.length} byLaw=${summary.chamberByLaw} missingActas=${missingActas.length}`,
  );
  if (missingActas.length) {
    process.exitCode = 1;
  }
}

main();
