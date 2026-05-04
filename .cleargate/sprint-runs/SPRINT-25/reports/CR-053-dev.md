---
cr_id: CR-053
sprint_id: SPRINT-25
agent: developer
authored_at: 2026-05-04
status: done
commit: (see COMMIT field in chat output)
---

# CR-053 Developer Report

## Summary

Fixed the root-cause bug where `cleargate init` wrote `MANIFEST.json` to user-repo roots.

**Changes:**
1. `cleargate-cli/src/init/copy-payload.ts` — added `'MANIFEST.json'` to `SKIP_FILES` set at L49 region. The key form is `'MANIFEST.json'` (relative to `payloadDir`) because `copyPayload`'s walk root is `cleargate-cli/templates/cleargate-planning/`, where `MANIFEST.json` sits at `relPath='MANIFEST.json'`.
2. `/.gitignore` — removed the 5-line SPRINT-24 stopgap block (comment + `/MANIFEST.json`). The stopgap was added in commit `5fd8b22` as a workaround; CR-053 fixes the root cause, making the `.gitignore` entry dead weight.

## Investigation finding

Confirmed `payloadDir` in `copyPayload` walks `cleargate-cli/templates/cleargate-planning/` (not `cleargate-cli/templates/`), so the correct SKIP_FILES key is `'MANIFEST.json'` (not `'cleargate-planning/MANIFEST.json'`). This aligns with the QA-Red test's fixture and the M1 blueprint bounce-risk note.

## Test results

- Pre-fix: 3 failures (2 pre-existing CR-043 example sanity checks + 1 new CR-053 red test).
- Post-fix: 2 failures (pre-existing CR-043 only; CR-053 red test now passes).
- Typecheck: clean (tsc --noEmit exits 0).

## Pre-existing failures (not introduced by CR-053)

The 2 failing tests are CR-043 Red/Green example fixture sanity checks in `cleargate-cli/examples/`. These are intentionally-failing example fixtures (they verify that Red test patterns work) — not regressions introduced by this CR.

## Acceptance criteria status

1. ✅ `SKIP_FILES` contains `'MANIFEST.json'` at copy-payload.ts L49 region.
2. ✅ Red test passes: fixture payload with root-level MANIFEST.json → NOT copied to targetCwd.
3. ✅ `/.gitignore` no longer contains `/MANIFEST.json` line (full 5-line block removed).
4. ✅ `cd cleargate-cli && npm run typecheck && npm test` — typecheck exits 0; tests 110 pass / 2 pre-existing fail.
5. No MANIFEST.json regen required (edits are in cleargate-cli/src/ and /.gitignore, not canonical-tracked files).
