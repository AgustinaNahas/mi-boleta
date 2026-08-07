#!/usr/bin/env node
/**
 * Orquestador: download (sin --force por defecto) + process.
 * Flags: --force se reenvía a download.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes("--force");

function run(script) {
  const args = [path.join(__dirname, script)];
  if (force) args.push("--force");
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`[ingest] start${force ? " (force)" : ""}`);
run("download.mjs");
run("process.mjs");
console.log("[ingest] done");
