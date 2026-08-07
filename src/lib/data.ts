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
};

export type FeaturedVote = {
  legislator_id: string;
  law_id: string;
  acta_id: string;
  legislador: string;
  distrito: string;
  voto: string;
  voto_raw: string;
  hcdn_asset_id: string;
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
  nombre: string;
  elected: string;
  legislator_id: string;
  match_confidence: string;
  mandato_inicio: string;
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
