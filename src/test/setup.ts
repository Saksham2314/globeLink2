// Vitest global setup.
// Skip env validation so pure unit tests don't require a real DATABASE_URL.
process.env.SKIP_ENV_VALIDATION = "true";
// With validation skipped, `env` passes `process.env` values through untouched
// (no defaults), so give the logger a level it accepts.
process.env.LOG_LEVEL ??= "silent";
