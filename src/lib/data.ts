import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const dataRoot = path.join(process.cwd(), "data", "processed");

export type ExampleVote = {
  legislador: string;
  distrito: string;
  lista: string;
  ley: string;
  voto: string;
};

export type FeaturedLaw = {
  id: string;
  title: string;
  summary: string;
  date?: string;
  sourceUrl?: string;
  actaId?: string;
  period?: string;
  voteType?: "general" | "particular" | string;
};

export type Legislator = {
  id: string;
  nombre: string;
  distrito: string;
  source: string;
  foto?: string;
};

export type FeaturedVote = {
  legislator_id: string;
  law_id: string;
  acta_id: string;
  legislador: string;
  distrito: string;
  bloque?: string;
  voto: string;
  voto_raw: string;
  hcdn_asset_id: string;
  foto?: string;
};

export type Election = {
  id: string;
  year: string;
  type: string;
  cargo: string;
  date: string;
  label: string;
  status: string;
  note: string;
};

export type District = {
  id: string;
  name: string;
};

export type BallotList = {
  id: string;
  election_id: string;
  district_id: string;
  alliance: string;
  alliance_code: string;
  name: string;
};

export type CandidateWithSeat = {
  id: string;
  list_id: string;
  election_id: string;
  district_id: string;
  order: string;
  rol?: string;
  nombre: string;
  elected: string;
  legislator_id: string;
  match_confidence: string;
  mandato_inicio: string;
  mandato_fin?: string;
  foto?: string;
};

export function readProcessedCsv<T extends Record<string, string>>(
  filename: string,
): T[] {
  const filePath = path.join(dataRoot, filename);
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(
      `Error parseando ${filename}: ${first.message} (fila ${first.row})`,
    );
  }

  return parsed.data;
}

export function readProcessedJson<T>(filename: string): T {
  const filePath = path.join(dataRoot, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function getExampleVotes(): ExampleVote[] {
  return readProcessedCsv<ExampleVote>("example_votes.csv");
}

export function getFeaturedLaws(): FeaturedLaw[] {
  return readProcessedJson<FeaturedLaw[]>("featured_laws.json");
}

export function getLegislators(): Legislator[] {
  return readProcessedCsv<Legislator>("legislators.csv");
}

export function getFeaturedVotes(): FeaturedVote[] {
  return readProcessedCsv<FeaturedVote>("votes_featured.csv");
}

export function getElections(): Election[] {
  return readProcessedCsv<Election>("elections.csv");
}

export function getDistricts(): District[] {
  return readProcessedCsv<District>("districts.csv");
}

export function getBallotLists(): BallotList[] {
  return readProcessedCsv<BallotList>("lists.csv");
}

export function getCandidatesWithSeats(): CandidateWithSeat[] {
  return readProcessedCsv<CandidateWithSeat>("candidates_with_seats.csv");
}

export type ChamberSeat = {
  legislator_id: string;
  nombre: string;
  distrito: string;
  bloque: string;
  mandato: string;
  foto?: string;
  chart_group?: string;
  seat_index: number;
  row?: number;
  x: number;
  y: number;
};

export type ChamberData = {
  generatedAt?: string;
  viewBox: string;
  layout?: string;
  chartGroups?: string[];
  blockOrder?: string[];
  lawId?: string;
  lawDate?: string;
  seats: ChamberSeat[];
};

export type ChamberByLaw = Record<string, ChamberData>;

export function getChamberSeats(): ChamberData {
  return readProcessedJson<ChamberData>("chamber_seats.json");
}

export function getChamberByLaw(): ChamberByLaw {
  return readProcessedJson<ChamberByLaw>("chamber_by_law.json");
}

export function getLegislatorById(id: string): Legislator | undefined {
  return getLegislators().find((l) => l.id === id);
}

export function getFeaturedVotesForLegislator(legislatorId: string): FeaturedVote[] {
  return getFeaturedVotes().filter((v) => v.legislator_id === legislatorId);
}

/** IDs con al menos un voto en el set editorial (para páginas estáticas). */
export function getLegislatorIdsWithFeaturedVotes(): string[] {
  const ids = new Set<string>();
  for (const v of getFeaturedVotes()) {
    if (v.legislator_id) ids.add(v.legislator_id);
  }
  return [...ids].sort();
}

export function getFeaturedLawById(id: string): FeaturedLaw | undefined {
  return getFeaturedLaws().find((l) => l.id === id);
}

export type LegislatorVoteBuckets = {
  aFavor: Array<{ vote: FeaturedVote; law: FeaturedLaw | undefined }>;
  enContra: Array<{ vote: FeaturedVote; law: FeaturedLaw | undefined }>;
  abstencion: Array<{ vote: FeaturedVote; law: FeaturedLaw | undefined }>;
  ausente: Array<{ vote: FeaturedVote; law: FeaturedLaw | undefined }>;
  otros: Array<{ vote: FeaturedVote; law: FeaturedLaw | undefined }>;
};

export function getLegislatorVoteBuckets(
  legislatorId: string,
): LegislatorVoteBuckets {
  const lawsById = new Map(getFeaturedLaws().map((l) => [l.id, l]));
  const buckets: LegislatorVoteBuckets = {
    aFavor: [],
    enContra: [],
    abstencion: [],
    ausente: [],
    otros: [],
  };

  for (const vote of getFeaturedVotesForLegislator(legislatorId)) {
    const row = { vote, law: lawsById.get(vote.law_id) };
    const key = vote.voto.toLowerCase();
    if (key === "afirmativo") buckets.aFavor.push(row);
    else if (key === "negativo") buckets.enContra.push(row);
    else if (key === "abstencion") buckets.abstencion.push(row);
    else if (key === "ausente") buckets.ausente.push(row);
    else buckets.otros.push(row);
  }

  const byDateDesc = (
    a: { law: FeaturedLaw | undefined },
    b: { law: FeaturedLaw | undefined },
  ) => (b.law?.date ?? "").localeCompare(a.law?.date ?? "");

  buckets.aFavor.sort(byDateDesc);
  buckets.enContra.sort(byDateDesc);
  buckets.abstencion.sort(byDateDesc);
  buckets.ausente.sort(byDateDesc);
  buckets.otros.sort(byDateDesc);
  return buckets;
}
