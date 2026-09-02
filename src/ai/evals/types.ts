/**
 * Shared shapes for the AI eval harness (see docs/adr/0012-*.md).
 *
 * Evals are NOT unit tests: they call a real model, cost money and vary run to
 * run. They live in `*.eval.ts` files (excluded from vitest) and run via
 * `npm run eval` on a schedule / on `src/ai/**` PRs. Only the pure scoring
 * helpers here are covered by vitest (`scoring.test.ts`).
 */

export interface CaseResult {
  name: string;
  passed: boolean;
  score: number; // 0..1
  detail: string;
}

export interface SuiteReport {
  suite: string;
  cases: number;
  passed: number;
  passRate: number; // 0..1
  meanScore: number; // 0..1
  durationMs: number;
  results: CaseResult[];
}

export interface EvalReport {
  generatedAt: string;
  model: { agent: string; extraction: string };
  suites: SuiteReport[];
  overall: { cases: number; passed: number; passRate: number };
}

export function summariseSuite(
  suite: string,
  results: CaseResult[],
  durationMs: number,
): SuiteReport {
  const passed = results.filter((r) => r.passed).length;
  const meanScore = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
  return {
    suite,
    cases: results.length,
    passed,
    passRate: results.length ? passed / results.length : 0,
    meanScore,
    durationMs,
    results,
  };
}

// --- pure scoring helpers (unit-tested) -----------------------------------

/** Case-insensitive, trimmed string equality; null/undefined compare equal. */
export function looseTextEqual(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v == null ? "" : String(v).trim().toLowerCase());
  return norm(a) === norm(b);
}

/** Order-independent equality for two string arrays (deduped, normalised). */
export function setEqual(a: readonly string[] = [], b: readonly string[] = []): boolean {
  const norm = (xs: readonly string[]) =>
    new Set(xs.map((x) => x.trim().toLowerCase()).filter(Boolean));
  const sa = norm(a);
  const sb = norm(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

/**
 * Score a candidate object against an `expected` partial: the fraction of
 * specified keys that match. Arrays use `setEqual`; everything else
 * `looseTextEqual`. Returns `{ score, misses }`.
 */
export function scoreFields<T extends Record<string, unknown>>(
  expected: Partial<T>,
  actual: T,
): { score: number; misses: string[] } {
  const keys = Object.keys(expected) as (keyof T & string)[];
  if (keys.length === 0) return { score: 1, misses: [] };

  const misses: string[] = [];
  for (const key of keys) {
    const want = expected[key];
    const got = actual[key];
    const ok = Array.isArray(want)
      ? setEqual(want as string[], (got as string[]) ?? [])
      : looseTextEqual(want, got);
    if (!ok) misses.push(`${key}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }
  return { score: (keys.length - misses.length) / keys.length, misses };
}
