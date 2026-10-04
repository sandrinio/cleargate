# BUG-085 M0 QA-Verify — hook-test canonical repoint (post-B0)

role: qa

## Mode

VERIFY, read-only. Commit under review: cli `story/BUG-085-m0` @ `86e339b`
(cut from cli `main` @ `a2694e4`, confirmed via `git merge-base` — BUG-067's
commits sit on the separate `story/BUG-067` branch and are NOT ancestors of
`story/BUG-085-m0`; `git branch --contains 93a4cfc` returns only
`story/BUG-067`). Full diff read (`git show 86e339b`, all three files, no
truncation) before any test run.

## (1) Path resolution — CLI_ROOT/META_ROOT/CLEARGATE_META_ROOT idiom

All three files carry the identical block:

```ts
const CLI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const META_ROOT = process.env.CLEARGATE_META_ROOT
  ? path.resolve(process.env.CLEARGATE_META_ROOT)
  : path.resolve(CLI_ROOT, '..');
const HOOK_PATH = path.join(META_ROOT, 'cleargate-planning', '.claude', 'hooks', '<hook>.sh');
```

replacing the old hardcoded `path.resolve(..., '../../..', '.claude/hooks/<hook>.sh')`
(live, gitignored, per-machine). Confirmed this is genuinely wired, not just
commented as such: ran
`CLEARGATE_META_ROOT=/tmp/does-not-exist-bug085-check npm run test:file -- test/hooks/pre-tool-use-task.node.test.ts`
and got a real `ENOENT` on
`/tmp/does-not-exist-bug085-check/cleargate-planning/.claude/hooks/pre-tool-use-task.sh`
— the env var is read and drives the actual path, and the path never contains
a bare `.claude/hooks/` segment (i.e., never the live install). All three
`HOOK_PATH` targets are `cleargate-planning/.claude/hooks/*`, never
`<repo>/.claude/hooks/*`.

## (2) Assertions match canonical hook behaviour

Read both canonical hooks in full at
`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-planning/.claude/hooks/`:

**`pre-tool-use-task.sh:51-60`** — guard is exactly:
```
case "${TOOL_NAME}" in
  Task|Agent) ;;
  *) if [[ -z "${SUBAGENT_TYPE_PROBE}" ]]; then reject; fi ;;
esac
```
i.e. `Task`/`Agent` always accepted; any other `tool_name` accepted only if
`tool_input.subagent_type` is non-empty; rejected only when both fail. The
three new tests each isolate one branch exactly:
- `Agent` + `subagent_type: developer` → accepted (Task|Agent branch) — traced
  through to the marker-write block (`ALLOW_LIST` includes `developer`,
  `STORY=026-01` → normalized `STORY-026-01`); test asserts
  `work_item_id: 'STORY-026-01'`, `agent_type: 'developer'` — matches the
  hook's own normalization (`sed 's/=/\-/'`) and `ALLOW_LIST` membership.
- `Edit` with no `subagent_type` field at all → `SUBAGENT_TYPE_PROBE` empty,
  `tool_name` not in `{Task,Agent}` → rejected before any marker logic runs —
  test asserts 0 dispatch files. Correct.
- `FutureAgentTool` + `subagent_type: developer` → not in `{Task,Agent}` but
  probe non-empty → accepted — test asserts 1 dispatch file. Correct; proves
  the generalized branch, not just the literal `Task`/`Agent` values.

**`token-ledger.sh` "resolve agent_type and work_item_id" block (lines
313-345)** — confirmed by direct read: `AGENT_TYPE`/`WORK_ITEM_ID` are seeded
*only* from `SENTINEL_AGENT_TYPE`/`SENTINEL_WORK_ITEM_ID` (populated earlier
from a dispatch marker or pending-task sentinel); if empty (or `"unknown"` for
agent_type) they become `"unattributed"` / `""` respectively. No
transcript-grep code path exists anywhere in the file (confirmed by reading
the full "Work-item ID / agent_type resolution" doc-comment block, which
explicitly says "(Removed): transcript-grep inference"). Every changed
assertion in `token-ledger-attribution.node.test.ts` (Scenario 2, CR-026-B)
and `token-ledger-regression.node.test.ts` (5 "detects X" → "does not infer X"
conversions, the SPRINT-04 fixture's `story_id`, the turn-ordering test, the
"missing sentinel" test) now asserts `work_item_id: ''` / `story_id: ''` /
`agent_type: 'unattributed'` for fixtures that supply neither a dispatch
marker nor a sentinel — exactly what the source does. Confirmed the two
fields' independent-refusal behavior described in the hook's own comment
(agent_type can carry sentinel ground truth while work_item_id still refuses)
is not contradicted by any test change — none of the touched tests exercise
that split case, and none of the sentinel-present fixtures were touched.

## (3) No weakened/deleted assertions; +2 count explained

- `pre-tool-use-task.node.test.ts`: 1 test ("non-Task tool_name...") removed,
  3 tests added, each a stricter/more specific assertion than the one it
  replaced (the removed test's own premise was invalid — its payload carried
  `subagent_type: 'developer'`, which the current guard *accepts*, so the old
  assertion of "0 dispatch files" was asserting behaviour the canonical hook
  does not have). Net **+2**, matches the dispatch note and the dev report.
  Confirmed via `git show --numstat`: `56 insertions(+), 9 deletions(-)`,
  consistent with a 1→3 test split plus the import/path-resolution churn.
- `token-ledger-attribution.node.test.ts`: 2 tests renamed/re-asserted
  (Scenario 2, CR-026-B), 0 added/removed. `33/23` numstat, consistent with
  doc-comment + assertion rewrites only.
- `token-ledger-regression.node.test.ts`: 5 "detects X work-item" tests
  renamed to "does not infer X identity" (same count, stricter assertions:
  `work_item_id`/`story_id` now must be empty, not a specific transcript-
  derived value); 1 sprint-routing test keeps its `sprint_id` assertions
  unchanged, only `story_id` tightened to `''`; 1 describe+test renamed
  ("turn-5 wins" → "turn ordering cannot infer an identity"), same stricter
  pattern; 1 test renamed ("missing sentinel is a silent no-op..." → "...
  writes an explicitly unattributed row"), `delta_from_turn: 0` assertion
  preserved verbatim, identity assertion tightened. `51/37` numstat. No test
  deleted outright — every "detects X" test became a "does not infer X" test
  in place; no test count change in this file (dev report doesn't claim one
  for this file, only for `pre-tool-use-task.node.test.ts`).
- Spot-checked (via the diff, not just the dev report's word) that every
  dispatch-marker-present test (Scenario 1/4/5, "STORY-* dispatch", CR-026-A)
  and every sentinel-present test (sentinel-drives-attribution, delta-model,
  two-consecutive-fires, sentinel-deleted-after-write) is **absent from the
  diff** — i.e. genuinely untouched, not just claimed so.

## Re-run (wrapped, cli checkout, `story/BUG-085-m0` @ `86e339b`)

`npm run test:file -- test/hooks/pre-tool-use-task.node.test.ts test/hooks/token-ledger-attribution.node.test.ts test/hooks/token-ledger-regression.node.test.ts`

Result: **36 of 36 pass, 0 fail** (13 + 9 + 14, matching the dev report
exactly). `npm run typecheck`: clean. No full suite run (per dispatch
instruction). `git status --porcelain` in both the cli checkout and the outer
MAIN checkout's `.cleargate/delivery` / `cleargate-planning/MANIFEST.json`
paths confirmed clean before and after (only a gitignored script-incident
artifact from the deliberate `ENOENT` sanity probe above, plus a pre-existing
unrelated stray `.tgz`).

## Verdict

QA: PASS

All three files now resolve exclusively through the canonical
`cleargate-planning/.claude/hooks/*` path via the CLI_ROOT/META_ROOT idiom
(verified to genuinely honor `CLEARGATE_META_ROOT`, not merely claim to);
every changed assertion was traced against the actual canonical hook source
(not taken on the dev report's word) and matches BUG-068's dispatch-guard
generalization and BUG-069's marker/sentinel-only attribution exactly; no
assertion was weakened (every change is a tightening, from a fabricated
specific value to an explicit empty/unattributed one) and no test was deleted
without conversion; the pre-tool-use-task +2 count is fully explained by a
1-test→3-test split whose old premise was itself invalid under the current
guard. Targeted re-run is 36/36 green.

flashcards_flagged: []
