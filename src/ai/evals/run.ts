import "./_env";

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { AGENT_MODEL_ID, EXTRACTION_MODEL_ID } from "../provider";
import { runE2ESuite } from "./e2e.eval";
import { runExtractionSuite } from "./extraction.eval";
import { runToolSelectionSuite } from "./tool-selection.eval";
import type { EvalReport, SuiteReport } from "./types";

const REPORT_PATH = resolve(process.cwd(), "src/ai/evals/report.json");
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

function printSuite(s: SuiteReport): void {
  console.log(
    `\n${s.suite}  —  ${s.passed}/${s.cases} passed (${pct(s.passRate)}), ` +
      `mean score ${pct(s.meanScore)}, ${(s.durationMs / 1000).toFixed(1)}s`,
  );
  for (const r of s.results) {
    console.log(`  ${r.passed ? "PASS" : "FAIL"}  ${r.name}`);
    console.log(`        ${r.detail}`);
  }
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set — evals need a real model. Aborting.");
    process.exit(2);
  }

  console.log("Running AI evals (this calls a real model and costs a little)…");

  const suites: SuiteReport[] = [];
  // Sequential so token usage and rate limits stay predictable.
  suites.push(await runExtractionSuite());
  suites.push(await runToolSelectionSuite());
  suites.push(await runE2ESuite());

  for (const s of suites) printSuite(s);

  const cases = suites.reduce((n, s) => n + s.cases, 0);
  const passed = suites.reduce((n, s) => n + s.passed, 0);
  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    model: { agent: AGENT_MODEL_ID, extraction: EXTRACTION_MODEL_ID },
    suites,
    overall: { cases, passed, passRate: cases ? passed / cases : 0 },
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nOverall: ${passed}/${cases} (${pct(report.overall.passRate)})`);
  console.log(`Report written to ${REPORT_PATH}`);

  // Informational, not a gate: only a harness failure exits non-zero.
}

main().catch((err) => {
  console.error("eval run failed:", err);
  process.exit(1);
});
