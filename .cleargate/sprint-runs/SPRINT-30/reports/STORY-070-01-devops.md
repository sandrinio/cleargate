# DevOps Report — STORY-070-01

STATUS: done (see §Resume — all steps completed after dist rebuild)

## Merge Result

- Sprint branch: sprint/S-30
- Story branch: story/STORY-070-01
- Merge commit SHA: 6d4223fb65468fd6fd9b610c941b0ed8eb378e57
- Merge strategy: ort (--no-ff)
- Diff stat: 39 files changed, 1916 insertions(+), 699 deletions(-)
- Prebuild sync commit SHA: aa9eee6312653e692ab37b9085a30996ef15c1cc
  - Subject: `chore(SPRINT-30): npm prebuild sync after STORY-070-01 merge`
  - Files: cleargate-planning/MANIFEST.json (timestamp update only, 1 insertion, 1 deletion)

## Post-Merge Tests

- Test files run:
  - `cleargate-cli/test/util/gate-mode.red.node.test.ts`
  - `cleargate-cli/test/scripts/migrate-schema-v3.red.node.test.ts`
  - `cleargate-cli/test/docs/no-execution-mode-vocabulary.red.node.test.ts`
  - `cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts`
  - `cleargate-cli/test/commands/doctor-retired-field.red.node.test.ts`
- Result: **39 passed, 0 failed** (re-run after `npm run build` rebuilt `dist/cli.js`)
- Exit code: 0
- Prior run (halted): 36 passed, 3 failed against stale dist — see STORY-070-01-devops-blockers.md for that incident detail

## Script Incidents

- `.cleargate/sprint-runs/SPRINT-30/.script-incidents/20260522T175742Z-4ac743d41b08.json`
  - Command: `node --test --import tsx/esm [5 test files]`
  - Exit code: 1
  - Timestamp: 2026-05-22T17:57:42Z

## Mirror Parity Audit

All 10 canonical↔npm-payload mirror files were audited after `npm run prebuild`. All byte-identical (clean).

| File | Result |
|------|--------|
| `.cleargate/knowledge/cleargate-enforcement.md` | diff empty (clean) |
| `.cleargate/scripts/_migrate-schema-v3.mjs` | diff empty (clean) |
| `.cleargate/scripts/close_sprint.mjs` | diff empty (clean) |
| `.cleargate/scripts/constants.mjs` | diff empty (clean) |
| `.cleargate/scripts/init_sprint.mjs` | diff empty (clean) |
| `.cleargate/scripts/state.schema.json` | diff empty (clean) |
| `.cleargate/scripts/update_state.mjs` | diff empty (clean) |
| `.cleargate/scripts/validate_state.mjs` | diff empty (clean) |
| `.cleargate/templates/Sprint Plan Template.md` | diff empty (clean) |
| `CLAUDE.md` | diff empty (clean) |

## State Transition

- Story state: Done (confirmed via state.json)
- Migrator side-effect: `execution_mode` stripped, `schema_version` bumped to 3
- Transitioned at: 2026-05-22T00:00:00Z (approximate)

## Cleanup

- Worktree `.worktrees/STORY-070-01`: removed (forced — untracked node_modules + script-incidents; dev work already merged)
- Branch `story/STORY-070-01`: deleted (was `145a28c2`)

## Notes

1. **`npm run build` required before retry.** The only blocker is a stale `dist/cli.js`. After `cd cleargate-cli && npm run build`, all 39 scenarios are expected to pass (36 already pass against the source-only paths that do not go through `dist/`).

2. **Live `/.claude/` re-sync still pending.** This is a Gate-4 doc-refresh item per sprint-context Cross-Cutting Rule 2 (three-site dogfood-mirror discipline). After the sprint closes, the live `/.claude/` instance must be re-synced via `cleargate init` or hand-port to pick up the CLAUDE.md `**Sprint mode.**` paragraph deletion and any other canonical changes from this story.

---

## Resume — Post-Rebuild Completion (2026-05-22)

**Context:** Prior run halted at step 6 because `dist/cli.js` was stale (built 52h before dev commit). Orchestrator ran `cd cleargate-cli && npm run build` (ESM + DTS, 93ms + 1998ms). `cleargate-planning/MANIFEST.json` timestamp churn was reverted via `git checkout` to keep tree clean. The prebuild sync commit `aa9eee63` is the authoritative MANIFEST.

### Step 6 — Post-Merge Test Verification (re-run)

All 5 Red test files re-run against fresh `dist/cli.js` on `sprint/S-30`:

- `cleargate-cli/test/util/gate-mode.red.node.test.ts`
- `cleargate-cli/test/scripts/migrate-schema-v3.red.node.test.ts`
- `cleargate-cli/test/docs/no-execution-mode-vocabulary.red.node.test.ts`
- `cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts`
- `cleargate-cli/test/commands/doctor-retired-field.red.node.test.ts`

Result: **39 passed, 0 failed** — exit code 0

Previously failing tests now passing:
- `advisory-env-gate.red.node.test.ts` — "CLEARGATE_ADVISORY=1 — exits 0 when gate would otherwise fail" PASS
- `advisory-env-gate.red.node.test.ts` — "CLEARGATE_ADVISORY=1 — stderr contains '[advisory]'" PASS
- `doctor-retired-field.red.node.test.ts` — "doctor output mentions execution_mode retired-field advisory" PASS

### Step 7 — Worktree Removal

- Worktree `.worktrees/STORY-070-01` had untracked files (`node_modules`, `.script-incidents/`) and a modified `cleargate-planning/MANIFEST.json` (timestamp-only; already reverted on sprint branch). All dev work was already merged. Forced removal applied (`--force`).
- Worktree `.worktrees/STORY-070-01`: **removed** (confirmed via `git worktree list` — no match)

### Step 8 — Branch Deletion

- Branch `story/STORY-070-01`: **deleted** (was `145a28c2`)

### Step 9 — State Transition

- `update_state.mjs STORY-070-01 Done` executed successfully
- Migrator side-effect: `execution_mode` stripped from live `SPRINT-30/state.json`, `schema_version` bumped to 3 (correct STORY-070-01 behavior exercised against live state)
- `state.json` confirmed: `STORY-070-01.state = "Done"`, `schema_version = 3`
- Transitioned at: 2026-05-22T00:00:00Z (approximate)
