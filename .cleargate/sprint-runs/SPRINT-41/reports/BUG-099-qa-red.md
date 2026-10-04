role: qa

# BUG-099 — QA-Red: codex-hooks.mjs check --write-result shape

STORY: BUG-099
QA-RED: WRITTEN
sha (story/BUG-099, cli worktree `.worktrees/BUG-099/cleargate-cli`): `3051626077942efa15dc8bea352e965dd36a939c`
Base commit: cli main `e720592` (merge(story/BUG-098))

RED_TESTS:
- `cleargate-cli/test/scripts/codex-hooks-write-result.red.node.test.ts` (4 tests, one per §5 Gherkin scenario)

## Solo run (`npm run test:file -- test/scripts/codex-hooks-write-result.red.node.test.ts`)

```
ℹ tests 4
ℹ suites 4
ℹ pass 0
ℹ fail 4
ℹ skipped 0
```

BASELINE_FAIL: 4 of 4

### Red reasons (each a missing field, not a wiring error)

Confirmed by direct invocation against a scratch git repo + a `checkCodexEvidence`-accepted
evidence file: the current `check --write-result` write is
`{ ok: false, reason: "...", artifactInputs: "...", checkedAt: "..." }` (or `ok: true` with no
`reason`) — `codex-hooks.mjs:868-872`. It has no `status`, `exit_code`, `story`, `command`, or
`ran_at`, and `checkCommand` never reads `opts.story` (no `--story` option exists).

| Scenario | Assertion that throws first | Actual | Expected | Cause |
|---|---|---|---|---|
| 1 — passing check writes green | `resultJson.story === 'STORY-058-10'` | `undefined` | `'STORY-058-10'` | `story` field absent from the write |
| 2 — failing check writes red | `resultJson.status === 'red'` | `undefined` | `'red'` | `status` field absent (`command`'s own exit code, asserted just before, is already 1 — correct, not red) |
| 3 — missing evidence file is a FAIL | `resultJson.status === 'red'` | `undefined` | `'red'` | `status` field absent (same root cause as 2) |
| 4 — `--story` overrides the story id | `resultJson.story === 'STORY-058-13'` | `undefined` | `'STORY-058-13'` | `story` field absent; `--story` is parsed into `opts` by the generic argv parser but `checkCommand` never consumes it |

Scenario 1 only reaches the `story` assertion (node:test throws on the first failing `assert` and
stops the test body), but `status`, `exit_code`, `command` and `ran_at` are independently absent
from the same object per the direct-invocation probe above — all five are the same defect
(the write block never mirrors the `claude-baseline.mjs:766-776` shape). Scenario 2's exit-code
assertion (`proc.status === 1`) passes at baseline as documented in BUG-099 §2 ("the command's
own exit code is already right"); only the file-shape assertions that follow are red.

No test failed on a wiring symptom (no `ENOENT`, no `TypeError`, no module-resolution error) —
every failure is `AssertionError` on `undefined !== <expected value>`.

## Anchors

```
codex-hooks-harness.red.node.test.ts   : tests 90, pass 90, fail 0, skipped 0
clean-room-evidence.red.node.test.ts   : tests 60, pass 60, fail 0, skipped 0
```

Note: the dispatch cited `codex-hooks-harness.red` as 91/91; the actual solo run at this base
commit (`e720592`) is 90/90 — fully green, 0 fail, 0 skipped, no regression from this change (the
new test file is a separate file; this anchor file was not touched). Flagging the count mismatch
rather than silently reconciling it.

`npm run typecheck`: clean (`tsc --noEmit`, no errors).

## Wiring notes for TPV

- `computeArtifactInputs`, `renderCodexRunSection` imported statically from
  `scripts/clean-room/evidence.mjs` — both already exist/exported at `e720592` (precedent:
  `clean-room-baseline-coexistence.red.node.test.ts` imports `computeArtifactInputs` from the
  same module the same way).
- `codex-hooks.mjs` is spawned as a real subprocess (`spawnSync(process.execPath, [CODEX_HOOKS_SCRIPT, 'check', ...])`),
  never imported — its CLI `main()` only runs when the file is executed directly (TPV ruling #3,
  plan M5-A38); precedent: `smoke-push-sprint-artifacts.red.node.test.ts`.
- Each test builds its own `fs.mkdtempSync` scratch git dir (for `computeArtifactInputs`) and
  scratch work dir (evidence + result files), removed by exact path in a `finally`. No shared
  fixture state between tests.
- No implementation file was read, edited, or referenced beyond what the dispatch named
  (`codex-hooks.mjs`, `claude-baseline.mjs`, `close_sprint.mjs`, `evidence.mjs` — all read-only).
  `evidence.mjs`, `claude-baseline.mjs`, `close_sprint.mjs` were not edited (BUG-099 §4 forbids
  editing them).

## Script Incidents

None — no `run_script.sh`-wrapped script was invoked; all invocations were direct `node`/`git`/`npm`
per the QA-Red workflow, not the sprint automation scripts.

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa-red #clean-room · codex-hooks-harness.red is 90/90 at e720592, not the 91/91 an earlier dispatch cited."
```
