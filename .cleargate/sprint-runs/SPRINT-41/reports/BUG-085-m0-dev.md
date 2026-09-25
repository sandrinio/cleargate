# BUG-085 M0 Developer Report — hook-test canonical repoint (post-B0)

role: developer

## Context

Barrier B0 re-synced the live `/Users/ssuladze/Documents/Dev/ClearGate/.claude/` from canonical
(evidence: `.cleargate/sprint-runs/SPRINT-41/reports/BUG-085-b0-proof.md`). Three cli tests read
that live, per-machine, gitignored directory directly (via a hardcoded
`<cli>/test/hooks/../../../.claude/hooks/<hook>.sh` resolution) and pinned the pre-BUG-068/069
contracts. Once the live copy actually matched canonical, they started failing:

- `test/hooks/pre-tool-use-task.node.test.ts`
- `test/hooks/token-ledger-attribution.node.test.ts`
- `test/hooks/token-ledger-regression.node.test.ts`

## Fix (cli `story/BUG-085-m0`, cut from cli main `a2694e4`)

**1. Path resolution.** All three files now resolve the hook via the sanctioned
`CLI_ROOT`/`META_ROOT`/`CLEARGATE_META_ROOT` idiom instead of a hardcoded relative walk into
the live `.claude/`:

```ts
const CLI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const META_ROOT = process.env.CLEARGATE_META_ROOT
  ? path.resolve(process.env.CLEARGATE_META_ROOT)
  : path.resolve(CLI_ROOT, '..');
const HOOK_PATH = path.join(META_ROOT, 'cleargate-planning', '.claude', 'hooks', '<hook>.sh');
```

A cli test must never read the live `.claude/` — this matches the idiom already established in
`test/lib/readiness-predicates-test-layers-declared.red.node.test.ts` and BUG-089's
`hook-signal.red.node.test.ts`.

**2. Assertion updates.** Re-derived directly from the canonical hooks' current source (not
copied blind from the CG_TEST-era `a0d5898` diff, though the resulting shape matches it closely
— I verified independently before comparing):

- **`pre-tool-use-task.sh` (BUG-068), lines 51-60 of the canonical hook:** the dispatch guard
  accepts `tool_name` in `{Task, Agent}` unconditionally, OR any other `tool_name` whose
  `tool_input` carries a non-empty `subagent_type`; it rejects only when *both* conditions fail.
  The old single test named "non-Task tool_name → hook exits 0 without writing dispatch" used a
  payload with `tool_name: 'Edit'` **and** `tool_input.subagent_type: 'developer'` — under the
  current guard that payload actually takes the *acceptance* path (subagent-shape), so the test's
  own premise was already wrong, not just its label. Split into three tests, each isolating one
  branch of the real guard:
  - `Agent tool_name is a dispatch tool and writes a ground-truth marker`
  - `Edit with no subagent_type is not a dispatch tool and writes no marker` (new payload: an
    actual edit-shaped `tool_input` with no `subagent_type` at all)
  - `unknown tool_name with a subagent-shaped payload still writes a dispatch marker` (proves the
    generalized "any tool + subagent shape" acceptance path, not just `Task`/`Agent` literally)
- **`token-ledger.sh` (BUG-069), the "resolve agent_type and work_item_id" block:** attribution
  comes ONLY from a dispatch marker (`.dispatch-*.json`) or a pending-task sentinel
  (`.pending-task-*.json`) — there is no transcript-grep fallback left at all. Every test whose
  fixture had **no dispatch marker and no sentinel** but still asserted a transcript-derived
  `work_item_id`/`story_id` had its assertion changed to `work_item_id: ''`,
  `agent_type: 'unattributed'` (and `story_id: ''` where applicable):
  - `token-ledger-attribution.node.test.ts`: Scenario 2 ("dispatch file absent"), CR-026-B
    (SessionStart-banner-poisoned transcript)
  - `token-ledger-regression.node.test.ts`: the 5 STORY/PROPOSAL/EPIC/CR/BUG
    "detects X work-item from first user message" tests (whole premise was the removed
    transcript-grep — converted to a `does not infer X identity` describe block, not deleted),
    the SPRINT-04 regression fixture (kept its sprint-routing assertions unchanged — those are
    sentinel-based and still correct; only the transcript-derived `story_id` assertion changed),
    the "turn-5 wins over turn-1" test + its describe block (renamed to reflect there is no
    "per-turn prompt wins" logic left to prove — only that turn ordering still can't fabricate an
    identity), and the "missing sentinel is a silent no-op that still writes a row using legacy
    detection" test (renamed; `delta_from_turn: 0` assertion preserved, identity assertion fixed)
  - Every dispatch-marker-present test (Scenario 1/4/5, "STORY-* dispatch", CR-026-A) and every
    sentinel-present test ("sentinel drives agent_type and work_item_id", delta-model tests,
    "sentinel is deleted after successful row write") is **unchanged** — those ground-truth paths
    are exactly what BUG-069 preserved; only the transcript fallback was removed.

No assertion was weakened and no test was deleted — five tests whose whole premise was the
obsolete transcript-grep contract were converted to assert the new contract instead (per
dispatch instruction 2).

## Verification

- `bash .cleargate/scripts/run_script.sh npm run test:file -- test/hooks/pre-tool-use-task.node.test.ts` → **13/13 pass**.
- `bash .cleargate/scripts/run_script.sh npm run test:file -- test/hooks/token-ledger-attribution.node.test.ts` → **9/9 pass**.
- `bash .cleargate/scripts/run_script.sh npm run test:file -- test/hooks/token-ledger-regression.node.test.ts` → **14/14 pass**.
- All three together: **36/36 pass**.
- `npm run typecheck` → clean.
- Full `npm test`, plain (not wrapped): **2700 tests, 2697 pass, 0 fail, 3 skipped.** The
  dispatch estimated 2698; the actual is 2 higher because the `pre-tool-use-task.sh` fix grows
  one test into three (net +2), matching `a0d5898`'s own shape for that file. 0 fail is the
  material result and matches exactly.
- Rule 14 revert: `git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain -- .cleargate/delivery cleargate-planning/MANIFEST.json`
  showed only the expected pending-sync back-sync + MANIFEST.json diffs (no other paths dirtied),
  then `git -C /Users/ssuladze/Documents/Dev/ClearGate checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`.
- Did not run `npm run build`.

## Not mine

BUG-067 (frontmatter locator) is parked on its own branch — not touched. The `resolveHookSignal`
vs `resolveBlockSignal` naming reconciliation (STORY-058-10) and any further BUG-085 M0/M3 work
(live-session denial/allow controls, durable detect-and-warn integration) remain out of this
dispatch's scope.

BUG: BUG-085
STATUS: done
COMMIT: cli 86e339b (story/BUG-085-m0, cut from cli main a2694e4)
TYPECHECK: pass
TESTS: pre-tool-use-task.node.test.ts 13 passed 0 failed; token-ledger-attribution.node.test.ts 9 passed 0 failed; token-ledger-regression.node.test.ts 14 passed 0 failed; all three together 36 passed 0 failed; full cli suite (plain, mandated) 2697 passed 0 failed 3 skipped (2700 total, 2 more than the 2698 estimate — accounted for above)
FILES_CHANGED: cleargate-cli/test/hooks/pre-tool-use-task.node.test.ts, cleargate-cli/test/hooks/token-ledger-attribution.node.test.ts, cleargate-cli/test/hooks/token-ledger-regression.node.test.ts
NOTES: No outer commit — per dispatch instruction 4, the orchestrator records the §4 amendment on BUG-085 itself. This report intentionally left uncommitted in the main checkout for the orchestrator to pick up.
flashcards_flagged:
  - "2026-09-25 · #test-harness #hooks #live-vs-canonical · A cli test resolving `<cli>/../../../.claude/hooks/*.sh` reads the per-machine gitignored LIVE install, not canonical — passes silently until B0 re-syncs live from canonical, then breaks on old pinned contracts. Always use the CLI_ROOT/META_ROOT/CLEARGATE_META_ROOT idiom."
