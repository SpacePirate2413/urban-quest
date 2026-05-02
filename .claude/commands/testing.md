# /testing

Run the full Phase 1 test suite (api integration tests) and update `Testing.md`.

## Steps

1. Run the doc generator + test suite in one shot:

   ```bash
   node scripts/update-testing-doc.mjs
   ```

   This runs `vitest run --reporter=json`, parses the results, and rewrites `Testing.md` at the repo root.

2. Read the script's stdout. Two outcomes:
   - **All passing** — print a one-line confirmation with the pass count and a link to `Testing.md`.
   - **Any failing** — emit a **loud warning** at the top of your reply (use bold + ❌ icons), list every failing test by number and name, and link the user to `Testing.md` for the per-test breakdown. Do not bury the warning.

3. If the script exits non-zero (= failing tests), surface the failure in your reply even though the doc was still updated. Do not call this a success.

## Notes

- The script writes test results to `apps/api/test-results.json` (gitignored — temporary file).
- Tests run against `apps/api/test.db`, a separate SQLite file from `dev.db`. Your dev data is never touched.
- Phase 1 is API integration tests only. Unit and E2E tests come in later phases.
