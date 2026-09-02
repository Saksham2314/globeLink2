/**
 * Load `.env` into `process.env` for `npm run eval`, without pulling in a
 * dependency. Imported first in `run.ts` so it runs before any module that
 * reads `@/lib/env`. A missing `.env` is fine — CI passes real env vars and
 * this becomes a no-op. Never overrides a value already set in the environment.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), ".env");

if (existsSync(path)) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
