#!/usr/bin/env node
/**
 * Genera processed de listas/electos (piloto CABA + Buenos Aires).
 * Generales 2023 + 2025 desde Excel CNE.
 */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import {
  districtCanonical,
  nameKeyFromParts,
  normalizeName,
  processedDir,
  rawDir,
  slugify,
  writeCsv,
  writeJson,
} from "./lib.mjs";

const ELECTION_SPECS = [
  {
    id: "diputados-2019",
    year: "2019",
    type: "general",
    cargo: "diputados",
    date: "2019-10-27",
    label: "Diputados nacionales · Generales 2019",
    xlsx: "candidaturas-2019.xlsx",
    mandatoYear: "2019",
    electosSource: "argentinadatos",
    mandatoInicioPrefix: "2019-12",
  },
  {
    id: "diputados-2021",
    year: "2021",
    type: "general",
    cargo: "diputados",
    date: "2021-11-14",
    label: "Diputados nacionales · Generales 2021",
    xlsx: "candidaturas-2021.xlsx",
    mandatoYear: "2021",
    electosSource: "argentinadatos",
    mandatoInicioPrefix: "2021-12",
  },
  {
    id: "diputados-2023",
    year: "2023",
    type: "general",
    cargo: "diputados",
    date: "2023-10-22",
    label: "Diputados nacionales · Generales 2023",
    xlsx: "candidaturas-2023.xlsx",
    mandatoYear: "2023",
    electosSource: "hcdn",
  },
  {
    id: "diputados-2025",
    year: "2025",
    type: "general",
    cargo: "diputados",
    date: "2025-10-26",
    label: "Diputados nacionales · Generales 2025",
    xlsx: "candidaturas-2025.xlsx",
    mandatoYear: "2025",
    electosSource: "hcdn",
  },
];

function allianceDisplay(ap) {
  return String(ap ?? "")
    .replace(/^ALIANZA\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHcdnComposition() {
  const csvPath = path.join(rawDir, "hcdn", "composicion-actual.csv");
  if (!fs.existsSync(csvPath)) return [];
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.trim().split(/\r?\n/);
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
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadArgDatosDiputados() {
  const p = path.join(rawDir, "argentinadatos", "diputados.json");
  if (!fs.existsSync(p)) return [];
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return Array.isArray(data) ? data : [];
}

function electosFromArgDatos(argDiputados, inicioPrefix) {
  const prefix = String(inicioPrefix ?? "");
  const byId = new Map();
  for (const d of argDiputados) {
    const inicio = String(d.periodoMandato?.inicio ?? "").slice(0, 10);
    if (!inicio.startsWith(prefix)) continue;
    const id = d.id || `${d.apellido}-${d.nombre}-${inicio}`;
    // Una fila por id (si hay duplicados, preferir la de este inicio)
    byId.set(id, {
      apellido: d.apellido ?? "",
      nombre: d.nombre ?? "",
      distrito: districtCanonical(d.provincia),
      mandato: `${inicio.slice(0, 4)}-${String(d.periodoMandato?.fin ?? "").slice(0, 4)}`,
      inicio: inicio.includes("-")
        ? `${inicio.slice(8, 10)}/${inicio.slice(5, 7)}/${inicio.slice(0, 4)}`
        : "",
      bloque: String(d.bloque ?? "").trim(),
      legislator_id: d.id || "",
      mandato_fin: String(d.ceseFecha || d.periodoMandato?.fin || "").slice(0, 10),
    });
  }
  return [...byId.values()].filter((e) => Boolean(e.distrito));
}

function mandatoFinFromRange(mandato, inicioIso) {
  const m = String(mandato ?? "").match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (m) return `${m[2]}-12-09`;
  if (inicioIso && /^\d{4}-\d{2}-\d{2}$/.test(inicioIso)) {
    const y = Number(inicioIso.slice(0, 4)) + 4;
    return `${y}-12-09`;
  }
  return "";
}

function loadLegislators() {
  const p = path.join(processedDir, "legislators.csv");
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, "utf8");
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").replaceAll('"', "");
    });
    return row;
  });
}

/** Aliases electo HCDN → candidato CNE (nombres políticos distintos del padrón). */
function loadAliases() {
  const aliasesPath = path.join(processedDir, "aliases.csv");
  if (!fs.existsSync(aliasesPath)) return [];
  const text = fs.readFileSync(aliasesPath, "utf8").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines
    .slice(1)
    .map((line) => {
      const cols = splitCsvLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] ?? "").replaceAll('"', "").trim();
      });
      return row;
    })
    .filter((r) => r.electo_name && r.candidate_id);
}

function aliasKey(electoName, district, electionId) {
  return `${normalizeName(electoName)}|${normalizeName(district)}|${electionId}`;
}

function nameTokens(value) {
  return normalizeName(value)
    .replace(/["“”']/g, " ")
    .split(" ")
    .filter((t) => t && t !== "de" && t !== "del" && t !== "la" && t !== "los");
}

function scoreNameOverlap(electoNombre, candNombres) {
  const e = nameTokens(electoNombre);
  const c = new Set(nameTokens(candNombres));
  if (!e.length || !c.size) return 0;
  let hit = 0;
  for (const t of e) {
    if (c.has(t)) hit += 1;
    else if ([...c].some((x) => x.startsWith(t) || t.startsWith(x))) hit += 0.5;
  }
  return hit / e.length;
}

function matchElectoToCandidate(electo, candidatesInDistrict) {
  const electoKeys = new Set([
    nameKeyFromParts(electo.apellido, electo.nombre),
    normalizeName(`${electo.nombre} ${electo.apellido}`),
  ]);

  const scored = [];
  for (const c of candidatesInDistrict) {
    const candKeys = new Set([
      nameKeyFromParts(c.apellido, c.nombres),
      normalizeName(c.candidatura),
      normalizeName(`${c.nombres} ${c.apellido}`),
      nameKeyFromParts(
        String(c.nombre).split(",")[0] ?? "",
        String(c.nombre).split(",").slice(1).join(","),
      ),
    ]);
    let best = 0;
    for (const ek of electoKeys) {
      for (const ck of candKeys) {
        if (!ek || !ck) continue;
        if (ek === ck) best = Math.max(best, 1);
        else best = Math.max(best, scoreNameOverlap(ek, ck));
      }
    }
    if (normalizeName(c.apellido) === normalizeName(electo.apellido)) {
      best = Math.max(best, scoreNameOverlap(electo.nombre, c.nombres));
      best = Math.max(best, scoreNameOverlap(electo.nombre, c.candidatura));
    }
    if (best > 0) scored.push({ c, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) return { confidence: "none", candidate: null };
  if (scored[0].score >= 0.99) {
    return { confidence: "exact", candidate: scored[0].c };
  }
  if (
    scored[0].score >= 0.6 &&
    (scored.length === 1 || scored[0].score - (scored[1]?.score ?? 0) >= 0.15)
  ) {
    return { confidence: "fuzzy", candidate: scored[0].c };
  }
  return {
    confidence: "none",
    candidate: null,
    candidates: scored.slice(0, 3).map((s) => ({
      id: s.c.id,
      nombre: s.c.nombre,
      score: s.score,
    })),
  };
}

function formatCandidatura(candidatura) {
  const parts = String(candidatura).trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return candidatura.trim();
  const apellido = parts[parts.length - 1];
  const nombres = parts.slice(0, -1).join(" ");
  return `${apellido}, ${nombres}`;
}

function rowGet(row, ...names) {
  for (const name of names) {
    if (row[name] != null && String(row[name]).trim() !== "") return row[name];
  }
  // trailing-space / case variants
  const keys = Object.keys(row);
  for (const name of names) {
    const found = keys.find(
      (k) => normalizeName(k) === normalizeName(name),
    );
    if (found && String(row[found]).trim() !== "") return row[found];
  }
  return "";
}

function loadCneGenerales(xlsxName) {
  const xlsxPath = path.join(rawDir, "cne", xlsxName);
  if (!fs.existsSync(xlsxPath)) {
    console.warn(`  skip: falta ${xlsxPath}`);
    return [];
  }
  const wb = XLSX.readFile(xlsxPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: "",
  });
  return rows.filter((r) => {
    const dist = districtCanonical(rowGet(r, "Distrito"));
    const eleccion = String(rowGet(r, "Elección", "Eleccion"));
    const estado = String(rowGet(r, "Estado"));
    const cargo = String(rowGet(r, "Cargo"));
    const sub = String(rowGet(r, "Subcategoria Cargo"));
    // 2019/2021 RAR ya son generales (sin columna Elección)
    const isGeneral = !eleccion || /GENERAL/i.test(eleccion);
    const isDip = /DIPUTAD/i.test(cargo);
    const isTitularOrSuplente = /titular|suplent/i.test(sub);
    const estadoOk = !estado || /APROBADA/i.test(estado);
    return (
      Boolean(dist) && isGeneral && isDip && isTitularOrSuplente && estadoOk
    );
  });
}

function candidateRol(subcategoria) {
  const sub = String(subcategoria ?? "");
  if (/suplent/i.test(sub)) return "suplente";
  return "titular";
}

function toIsoDate(dmy) {
  const m = String(dmy ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function main() {
  console.log("[ingest:process-listas] start");

  /** @type {Map<string, object>} */
  const listsByKey = new Map();
  const candidates = [];
  const elections = [];
  /** @type {Map<string, { id: string, name: string }>} */
  const districtsById = new Map();

  for (const spec of ELECTION_SPECS) {
    const raw = loadCneGenerales(spec.xlsx);
    const ready = raw.length > 0;
    elections.push({
      id: spec.id,
      year: spec.year,
      type: spec.type,
      cargo: spec.cargo,
      date: spec.date,
      label: spec.label,
      status: ready ? "ready" : "pending_source",
      note: ready
        ? ""
        : `Falta data/raw/cne/${spec.xlsx}`,
    });
    if (!ready) {
      console.warn(`  ${spec.id}: sin filas`);
      continue;
    }
    console.log(`  ${spec.id}: ${raw.length} candidatos (titulares + suplentes)`);

    for (const r of raw) {
      const district = districtCanonical(rowGet(r, "Distrito"));
      if (!district) continue;
      if (!districtsById.has(district)) {
        districtsById.set(district, { id: district, name: district });
      }
      const alliance = allianceDisplay(rowGet(r, "AP"));
      const listKey = `${district}|${spec.year}|${normalizeName(alliance)}`;
      if (!listsByKey.has(listKey)) {
        const listId =
          `${spec.year}-${slugify(district)}-${slugify(alliance)}`.slice(
            0,
            120,
          );
        listsByKey.set(listKey, {
          id: listId,
          election_id: spec.id,
          district_id: district,
          alliance,
          alliance_code: String(rowGet(r, "Codigo AP") ?? ""),
          name: alliance,
        });
      }
      const list = listsByKey.get(listKey);
      const order = Number(rowGet(r, "Posicion")) || 0;
      const rol = candidateRol(rowGet(r, "Subcategoria Cargo"));
      // Titulares conservan id histórico `lista-01`; suplentes: `lista-s-01`.
      const candidateId =
        rol === "suplente"
          ? `${list.id}-s-${String(order).padStart(2, "0")}`
          : `${list.id}-${String(order).padStart(2, "0")}`;
      const apellido = String(rowGet(r, "Apellido")).trim();
      const nombres = String(rowGet(r, "Nombres")).trim();
      const candidatura = String(
        rowGet(
          r,
          "Candidatura",
          "Precandidatura/candidatura",
          "Nombre Para Lista",
          "Candidato/a",
        ),
      ).trim();
      const display = candidatura
        ? formatCandidatura(candidatura)
        : `${apellido}, ${nombres}`.replace(/\s+/g, " ").trim();
      candidates.push({
        id: candidateId,
        list_id: list.id,
        election_id: spec.id,
        district_id: district,
        order: String(order),
        rol,
        apellido,
        nombres,
        candidatura,
        nombre: display,
        dni: String(rowGet(r, "DNI")),
        genero: String(rowGet(r, "Genero")),
      });
    }
  }

  const lists = [...listsByKey.values()].sort((a, b) =>
    `${a.election_id}-${a.district_id}-${a.alliance}`.localeCompare(
      `${b.election_id}-${b.district_id}-${b.alliance}`,
      "es",
    ),
  );

  const hcdn = parseHcdnComposition();
  const argDiputados = loadArgDatosDiputados();
  const legislators = loadLegislators();
  const legislatorByKey = new Map();
  for (const leg of legislators) {
    const parts = String(leg.nombre).split(",");
    legislatorByKey.set(
      nameKeyFromParts(parts[0] ?? "", parts.slice(1).join(",")),
      leg,
    );
  }

  const candidatesByElectionDistrict = new Map();
  const candidateById = new Map();
  for (const c of candidates) {
    const key = `${c.election_id}|${c.district_id}`;
    if (!candidatesByElectionDistrict.has(key)) {
      candidatesByElectionDistrict.set(key, []);
    }
    candidatesByElectionDistrict.get(key).push(c);
    candidateById.set(c.id, c);
  }

  const aliases = loadAliases();
  const aliasByKey = new Map();
  for (const a of aliases) {
    aliasByKey.set(
      aliasKey(a.electo_name, a.district, a.election_id),
      a,
    );
  }

  const seats = [];
  const review = [];
  const matchStats = {};

  for (const spec of ELECTION_SPECS) {
    if (!elections.find((e) => e.id === spec.id && e.status === "ready")) {
      continue;
    }
    const electos =
      spec.electosSource === "argentinadatos"
        ? electosFromArgDatos(argDiputados, spec.mandatoInicioPrefix)
        : hcdn
            .filter((r) => String(r.MANDATO).includes(spec.mandatoYear))
            .map((r) => ({
              apellido: r.APELLIDO,
              nombre: r.NOMBRE,
              distrito: districtCanonical(r.DISTRITO),
              mandato: r.MANDATO,
              inicio: r.FECHA_DE_INICIO,
              bloque: r.BLOQUE,
              legislator_id: "",
              mandato_fin: "",
            }))
            .filter((e) => Boolean(e.distrito));

    let matched = 0;
    for (const e of electos) {
      const pool =
        candidatesByElectionDistrict.get(`${spec.id}|${e.distrito}`) ?? [];
      const electoNombre = `${e.apellido}, ${e.nombre}`;
      const alias = aliasByKey.get(
        aliasKey(electoNombre, e.distrito, spec.id),
      );
      let match;
      if (alias) {
        const aliased = candidateById.get(alias.candidate_id);
        if (
          aliased &&
          aliased.election_id === spec.id &&
          aliased.district_id === e.distrito
        ) {
          match = { confidence: "alias", candidate: aliased };
        } else {
          match = {
            confidence: "none",
            candidate: null,
            candidates: [],
          };
          review.push({
            type: "alias_invalido",
            district: e.distrito,
            electo: electoNombre,
            bloque: e.bloque,
            mandato: e.mandato,
            candidate_id: alias.candidate_id,
            note: `${spec.id}: alias apunta a candidate_id inexistente o de otro distrito/elección`,
          });
          continue;
        }
      } else {
        match = matchElectoToCandidate(e, pool);
      }
      const legKey = nameKeyFromParts(e.apellido, e.nombre);
      let legislator = legislatorByKey.get(legKey);
      if (!legislator && e.legislator_id) {
        legislator = legislators.find((l) => l.id === e.legislator_id) ?? null;
      }
      if (!legislator && match.candidate) {
        legislator = legislatorByKey.get(
          nameKeyFromParts(match.candidate.apellido, match.candidate.nombres),
        );
      }
      if (!legislator) {
        const ape = normalizeName(e.apellido);
        const hits = legislators.filter(
          (l) =>
            districtCanonical(l.distrito) === e.distrito &&
            normalizeName(String(l.nombre).split(",")[0]) === ape,
        );
        if (hits.length === 1) legislator = hits[0];
      }

      const mandatoInicio = toIsoDate(e.inicio) || String(e.inicio ?? "").slice(0, 10);
      const mandatoFin =
        e.mandato_fin || mandatoFinFromRange(e.mandato, mandatoInicio);

      if (match.candidate && match.confidence !== "none") {
        matched += 1;
        seats.push({
          candidate_id: match.candidate.id,
          list_id: match.candidate.list_id,
          election_id: spec.id,
          district_id: e.distrito,
          legislator_id: legislator?.id ?? e.legislator_id ?? "",
          match_confidence: match.confidence,
          mandato: e.mandato,
          mandato_inicio: mandatoInicio,
          mandato_fin: mandatoFin,
          bloque_hcdn: e.bloque,
          electo_nombre: electoNombre,
        });
        if (!legislator && !e.legislator_id) {
          review.push({
            type: "electo_sin_legislator_id",
            district: e.distrito,
            electo: electoNombre,
            candidate_id: match.candidate.id,
            candidate: match.candidate.nombre,
            confidence: match.confidence,
            mandato: e.mandato,
            note: `${spec.id}: matcheó boleta pero no legislators.csv`,
          });
        }
      } else {
        review.push({
          type: "electo_sin_candidato",
          district: e.distrito,
          electo: electoNombre,
          bloque: e.bloque,
          mandato: e.mandato,
          candidates_considered: JSON.stringify(match.candidates ?? []),
          note: `${spec.id}: revisar aliases / nombre en boleta`,
        });
      }
    }
    matchStats[spec.id] = {
      electos: electos.length,
      matched,
      rate:
        electos.length === 0
          ? null
          : Number((matched / electos.length).toFixed(3)),
    };
    console.log(
      `  ${spec.id}: electos=${electos.length} matched=${matched} rate=${matchStats[spec.id].rate}`,
    );
  }

  const districts = [...districtsById.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  const fotoByLegislatorId = new Map(
    legislators
      .filter((l) => l.id && l.foto)
      .map((l) => [l.id, l.foto]),
  );

  writeCsv(
    path.join(processedDir, "elections.csv"),
    ["id", "year", "type", "cargo", "date", "label", "status", "note"],
    elections,
  );
  writeCsv(path.join(processedDir, "districts.csv"), ["id", "name"], districts);
  writeCsv(
    path.join(processedDir, "lists.csv"),
    [
      "id",
      "election_id",
      "district_id",
      "alliance",
      "alliance_code",
      "name",
    ],
    lists,
  );
  writeCsv(
    path.join(processedDir, "candidates.csv"),
    [
      "id",
      "list_id",
      "election_id",
      "district_id",
      "order",
      "rol",
      "apellido",
      "nombres",
      "candidatura",
      "nombre",
      "dni",
      "genero",
    ],
    candidates,
  );
  writeCsv(
    path.join(processedDir, "seats.csv"),
    [
      "candidate_id",
      "list_id",
      "election_id",
      "district_id",
      "legislator_id",
      "match_confidence",
      "mandato",
      "mandato_inicio",
      "mandato_fin",
      "bloque_hcdn",
      "electo_nombre",
    ],
    seats,
  );
  writeCsv(
    path.join(processedDir, "aliases.csv"),
    ["electo_name", "district", "election_id", "candidate_id", "note"],
    aliases,
  );
  writeCsv(
    path.join(processedDir, "match_review.csv"),
    [
      "type",
      "district",
      "electo",
      "bloque",
      "mandato",
      "candidate_id",
      "candidate",
      "confidence",
      "candidates_considered",
      "note",
    ],
    review.map((r) => ({
      bloque: "",
      mandato: "",
      candidate_id: "",
      candidate: "",
      confidence: "",
      candidates_considered: "",
      ...r,
    })),
  );

  writeCsv(
    path.join(processedDir, "candidates_with_seats.csv"),
    [
      "id",
      "list_id",
      "election_id",
      "district_id",
      "order",
      "rol",
      "nombre",
      "elected",
      "legislator_id",
      "match_confidence",
      "mandato_inicio",
      "mandato_fin",
      "foto",
    ],
    candidates.map((c) => {
      const seat = seats.find((s) => s.candidate_id === c.id);
      const legislatorId = seat?.legislator_id ?? "";
      return {
        id: c.id,
        list_id: c.list_id,
        election_id: c.election_id,
        district_id: c.district_id,
        order: c.order,
        rol: c.rol,
        nombre: c.nombre,
        elected: seat ? "true" : "false",
        legislator_id: legislatorId,
        match_confidence: seat?.match_confidence ?? "",
        mandato_inicio: seat?.mandato_inicio ?? "",
        mandato_fin: seat?.mandato_fin ?? "",
        foto: fotoByLegislatorId.get(legislatorId) ?? "",
      };
    }),
  );

  const summary = {
    processedAt: new Date().toISOString(),
    elections: elections.map((e) => ({
      id: e.id,
      status: e.status,
      ...(matchStats[e.id] ?? {}),
    })),
    lists: lists.length,
    candidates: candidates.length,
    seatsMatched: seats.length,
    reviewRows: review.length,
  };
  writeJson(path.join(processedDir, "listas_ingest_summary.json"), summary);
  console.log("[ingest:process-listas]", JSON.stringify(summary, null, 2));
}

main();
