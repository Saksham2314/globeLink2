import { extractTravelConstraints } from "../extraction/extract-constraints";
import type { TravelConstraints } from "../extraction/constraints.schema";
import { scoreFields, summariseSuite, type CaseResult, type SuiteReport } from "./types";

/**
 * Utterance → expected constraint fields. Only the keys that the phrase clearly
 * implies are asserted; unlisted keys are not scored. A case passes at score
 * ≥ 0.75 (most fields right), so one fuzzy field doesn't fail an otherwise
 * correct extraction.
 */
interface ExtractionCase {
  utterance: string;
  expect: Partial<TravelConstraints>;
}

const CASES: ExtractionCase[] = [
  {
    utterance: "10 days in Kyoto in April, love food and temples",
    expect: { destination: "Kyoto", durationDays: 10, month: "april" },
  },
  {
    utterance: "cheap two week backpacking trip around Vietnam",
    expect: { durationDays: 14, maxBudget: null },
  },
  {
    utterance: "relaxing beach honeymoon in the Maldives, budget 300000 INR",
    expect: { destination: "Maldives", maxBudget: 300000, currency: "INR" },
  },
  {
    utterance: "5 nights in Lisbon",
    expect: { destination: "Lisbon", durationDays: 5 },
  },
  {
    utterance: "trekking in Nepal for exactly 7 days in October",
    expect: { durationDays: 7, month: "october" },
  },
  {
    utterance: "somewhere warm for Christmas",
    expect: { destination: null, month: "december" },
  },
  {
    utterance: "wildlife safari in Kenya",
    expect: { region: "Kenya" },
  },
  {
    utterance: "hi there, what can you do?",
    expect: { destination: null, region: null, durationDays: null, maxBudget: null },
  },
];

const PASS_AT = 0.75;

export async function runExtractionSuite(): Promise<SuiteReport> {
  const started = Date.now();
  const results: CaseResult[] = [];

  for (const c of CASES) {
    const outcome = await extractTravelConstraints(c.utterance);
    if (!outcome) {
      results.push({
        name: c.utterance,
        passed: false,
        score: 0,
        detail: "extraction returned null (AI disabled or call failed)",
      });
      continue;
    }
    const { score, misses } = scoreFields(c.expect, outcome.constraints as Record<string, unknown>);
    results.push({
      name: c.utterance,
      passed: score >= PASS_AT,
      score,
      detail: misses.length ? misses.join("; ") : "all asserted fields matched",
    });
  }

  return summariseSuite("extraction", results, Date.now() - started);
}
