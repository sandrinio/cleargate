# BUG-085 — Developer report

role: developer

## Commits

**Cli** (`story/BUG-085` on `cleargate-cli`, base `8425816` re-seal, on main `b100ea8`):

```
12ae157 fix(EPIC-058): BUG-085 durable meta-repo drift detection, sentinel parser repairs, CR-117 port
```

4 files changed, 416 insertions(+), 89 deletions(-):
- `src/lib/drift-check.ts` — rewrite (`+308/-…`)
- `src/commands/doctor.ts` — drift-block comment reworded; `ClearGate drift:` session-start line inserted (`+25/-…`)
- `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` — bash-3.2 empty-array guard, JSON-array parser, multi-block scanning (`+124/-…`)
- `scaffold/core/.cleargate/scripts/validate_state.mjs` — byte copy of live `OUTER/.cleargate/scripts/validate_state.mjs` (`+48/-…`)

Untracked `cleargate-0.25.0.tgz` left alone (pre-existing).

**Outer** (`.worktrees/BUG-085` on `story/BUG-085`, base `ac6eb16e`):

```
68fd9426 fix(SPRINT-41): BUG-085 outer half — bug068 repoint & CLAUDE.md drift pointer
```

2 files changed, 20 insertions(+), 8 deletions(-):
- `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` — repointed at `cleargate-cli/scaffold/hosts/claude/.claude/hooks/` with `CLEARGATE_CLI_ROOT`/`BUG068_HOOKS_DIR` overrides
- `CLAUDE.md` — three stale-sentence fixes (canonical path, both re-sync commands, deprecated-snapshot reader list) + BUG-024 prose replaced with the mechanical-check pointer

## Count table (G9)

| Check | Expected | Actual |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `test/lib/drift-check-scaffold.red.node.test.ts` | 24/24 | 24/24 |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 13/13 (SKIP_FLASHCARD_GATE/CLEARGATE_ADVISORY unset) | 13/13 |
| `test/commands/doctor-drift-guard.node.test.ts` (10 in-process) | 10/10 | 10/10 |
| `test/commands/doctor-drift-guard.node.test.ts` (3 dist-spawning, scratch build) | 13/13 total | 13/13 (scratch clone `/private/tmp/cg-s41-dev085-dist`, deleted after) |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 11/11 | 11/11 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode) | 5/5 | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare mode) | 15/15 | 15/15 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 |
| 13 sealed -03..-07 contract files | 19/11/10/4/18/13/17/3/6/10/6/16/4 | 19/11/10/4/18/13/17/3/6/10/6/16/4 (exact match, in order: host-adapter-contract, host-selection, init-host-selection, init-host-cli, manifest-host-ownership, init-host-snapshot, host-lifecycle, host-cli, manifest-query, doctor-per-host, upgrade-per-host, uninstall-per-host, uninstall-reinit) |
| `test/commands/doctor.node.test.ts` | 39/39 | 39/39 |
| `test/commands/doctor-session-start.node.test.ts` | 20/20 | 20/20 |
| `test/hooks/hook-signal.red.node.test.ts` | 14/14 | 14/14 |
| `test/hooks/hook-signal.red.integration.node.test.ts` | 3/3 | 3/3 |
| `test/snapshots/hooks-snapshots.node.test.ts` | 14/14 (no `pending-task-sentinel` snapshot to re-baseline) | 14/14 |
| `test/hooks/run-id-ledger-attribution.red.node.test.ts` | 10/10 (main checkout, live `.claude/` present) | 10/10 |
| `test/scripts/parallel-dispatch.red.node.test.ts` | 6/6 | 6/6 |
| `test/docs/autonomy-contract.red.node.test.ts` | 30/30 | 30/30 |
| `bug068_dispatch_tool_name.red.sh` canonical mode | 10/10 | 10/10 |
| Baseline hash (`/private/tmp/cg-s41-m2-init-baseline`, absolute paths) | `bdc4bb1a…62b2` (425 files) unchanged | `bdc4bb1a…62b2` (425 files), unchanged before/after |

## Witness NAME diff (G9: doctor.node, doctor-session-start.node, hook-signal*, hooks-snapshots, run-id-ledger-attribution, parallel-dispatch, autonomy-contract vs cli main `b100ea8`)

Ran all 8 files against a scratch clone (`/private/tmp/cg-s41-dev085-witness`, `node_modules` symlinked, deleted after) checked out first at `b100ea8`, then at `12ae157`, so both sides share the identical scratch environment (no outer meta-repo sibling — this is what makes 3 of the 8 files show pre-existing environmental failures on both sides, per the TPV's own established methodology).

- `doctor.node.test.ts`: 39/39 both sides, 0 failing names.
- `doctor-session-start.node.test.ts`: 20/20 both sides, 0 failing names.
- `hook-signal.red.node.test.ts`: 14/14 both sides, 0 failing names.
- `hook-signal.red.integration.node.test.ts`: 3/3 both sides, 0 failing names.
- `hooks-snapshots.node.test.ts`: 14/14 both sides, 0 failing names.
- `run-id-ledger-attribution.red.node.test.ts`: **identical 9 failing names on both sides** (`STORY-033-02 Unit tests`, `STORY-033-02 Acceptance tests`, `Unit 1..4`, `Acceptance 1/3/4/5/6`) — environmental: the scratch clone has no outer `.claude/hooks/*` sibling. In the main checkout (live `.claude/` present) this file is 10/10, confirmed separately in the G9 count table above.
- `parallel-dispatch.red.node.test.ts`: **identical 3 failing names on both sides** (`BUG-029 Scenario 1…`, the two sub-assertions) — same scratch-environment cause.
- `autonomy-contract.red.node.test.ts`: **identical 7 failing names on both sides** (`p1`..`p7`, plus the wrapping `Scenario:` line) — the scratch clone has no `.cleargate/knowledge/cleargate-protocol.md` sibling to read (ENOENT), same on both commits.

No new failure and no newly-fixed failure anywhere — BUG-085 introduces zero regression on these 8 files.

## Rule 16 results

`command grep -rl CLEARGATE_META_ROOT cleargate-cli/test` → 21 hits; `test/helpers/scaffold-roots.ts` is the helper, excluded → 20 test files, each run solo with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-085` **after** the outer commit (`68fd9426`):

| File | Result |
|---|---|
| `test/commands/new-command.node.test.ts` | 57/57 |
| `test/commands/no-exec-mode-vocab.node.test.ts` | 4/4 |
| `test/docs/claude-md-block-leads-relocation.red.node.test.ts` | 4/4 |
| `test/docs/test-layers-declared-doctrine.red.node.test.ts` | 11/11 |
| `test/e2e/frontmatter-authoring.red.integration.node.test.ts` | 9/9 |
| `test/e2e/spidr-coverage.red.integration.node.test.ts` | 1/1 |
| `test/hooks/hook-signal.red.integration.node.test.ts` | 3/3 |
| `test/hooks/hook-signal.red.node.test.ts` | 14/14 |
| `test/hooks/pre-tool-use-task.node.test.ts` | 13/13 |
| `test/hooks/token-ledger-attribution.node.test.ts` | 9/9 |
| `test/hooks/token-ledger-regression.node.test.ts` | 14/14 |
| `test/lib/readiness-predicates-spidr-coverage.red.node.test.ts` | 32/32 |
| `test/lib/readiness-predicates-test-layers-declared.red.node.test.ts` | 17/17 |
| `test/scaffold/enforcement-doc-coherence.node.test.ts` | 26/26 |
| `test/scaffold/file-surface-gate-e2e.node.test.ts` | 21/21 |
| `test/scaffold/pre-commit-downstream-safe.node.test.ts` | 12/12 |
| `test/scaffold/ratchet-retired.node.test.ts` | 8/8 |
| `test/scripts/close-sprint-assume-ack-guard.node.test.ts` | **18/20** — expected: the worktree has no `cleargate-cli/src` (matches TPV's stated `close-sprint-assume-ack-guard 18/20 on both sides`); the 2 failures both read `${CLEARGATE_META_ROOT}/cleargate-cli/src/commands/sprint.ts` (`ENOENT`), environmental to the worktree's structure, not a BUG-085 regression |
| `test/scripts/scaffold-relocation.red.node.test.ts` | 15/15 |
| `test/wiki/bucket-registry-parity.red.node.test.ts` | 11/11 |

Never ran with the full suite. Worktree stayed clean (`git status --short` empty) throughout Rule 16.

## CLAUDE.md block hash

`<!-- CLEARGATE:START -->…END -->` block, before and after the outer commit, and `scaffold/hosts/claude/CLAUDE.md`'s own block — all three: `53d46a06a2dccabfbfa3f706709e2cc1778ce341d588110fa055dd1bac7cf4fb`. Unchanged (all four CLAUDE.md edits are outside the block, at lines ≥59; the block occupies lines 1-58).

## bug068 run output

Canonical mode, `CLEARGATE_CLI_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh`, run from the worktree, both before and after the outer commit:

```
Passed: 10
Failed: 0
All tests passed.
```

## Outer status

**Start** (recorded before any edit):
```
A  .cleargate/sprint-runs/SPRINT-41/.processed-0133bc771de9
A  .cleargate/sprint-runs/SPRINT-41/.processed-19e7a9e2d66d
A  .cleargate/sprint-runs/SPRINT-41/.processed-701f44e3e702
A  .cleargate/sprint-runs/SPRINT-41/.processed-aeed96b1c1de
A  .cleargate/sprint-runs/SPRINT-41/.processed-c1c3966d50f0
A  .cleargate/sprint-runs/SPRINT-41/.processed-df1f0a4aa115
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

**End**:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

The 6 staged `.processed-*` adds disappeared between start and end because a concurrent orchestrator commit landed on `sprint/S-41` mid-dispatch (`45ac7134 chore(SPRINT-41): RS-BUG085 step 6.1 prep — mark the 6 STORY-058-02 JSON cards processed`) — not this dispatch's doing; I never wrote to the outer main checkout. The remaining 4 `M` lines are hook-owned ledger/state files, unchanged in kind from start to end. No writing CLI smoke ran anywhere in this dispatch (no `init`/`upgrade`/`host add`/`uninstall`); the only smoke that touches disk state is the bug068 shell script, which writes only inside its own `mktemp -d` fixtures.

## New anchors for M4 V7-V8

**`checkCanonicalDrift` signature** (`src/lib/drift-check.ts:328`):
```ts
export function checkCanonicalDrift(cwd: string): DriftReport;
// DriftReport = { skipped: boolean; drifted: DriftedPath[]; allowed: DriftedPath[] };
// DriftReason = 'content-mismatch' | 'missing-in-live' | 'live-only' | 'claude-md-block-mismatch';
```

**Skip behaviour** (`:328-336`): computes `scaffoldRoot = path.join(cwd, 'cleargate-cli', 'scaffold')`, `coreCleargateDir = scaffoldRoot/core/.cleargate`, `canonicalClaudeDir = scaffoldRoot/hosts/claude/.claude`. Returns `{ skipped: true, drifted: [], allowed: [] }` when **either** `coreCleargateDir` or `canonicalClaudeDir` is absent (both are checked, though only the `core/.cleargate` half is exercised by a sealed test per TPV M3-A58's accepted-survivor note — the half-scaffold layout does not occur in practice). Never reads `cwd/cleargate-planning/`.

**Sentinel guard line** (`scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`): the bash-3.2 empty-array-safe loop head moved from `:102` (pre-BUG-085, byte-unchanged since `a821d40`) to **`:147`** in the post-BUG-085 payload (the file grew from 281 to 350 lines — `add_card`/`scan_json`/`JSON_STR_RE` were inserted above it):
```bash
for REPORT_FILE in ${REPORT_FILES[@]+"${REPORT_FILES[@]}"}; do
```

## Deviations from G1-G16

None. Every binding constraint (G1-G13; G14-G16 are DevOps/RS-BUG085-scoped, not Developer work) was implemented and verified as specified: `drift-check.ts`'s export surface, walk semantics and exception handling (G1-G3); `doctor.ts`'s comment-only default-mode edit and the session-start line placement/condition (G4); the sentinel's five sub-parts and gate condition, verbatim stderr text (G5); the `validate_state.mjs` byte copy at the exact target hash and mode (G6); zero test-file edits in the cli commit (G7); a scratch-clone dist build for the 3 lagging cases (G8); the full G9 run list; no CHANGELOG entry (G10); the bug068 repoint's exact two-line form and usage/error-message additions (G11); the four CLAUDE.md grep-key edits with the verbatim (d) replacement text and an unchanged block hash (G12); and outer-commit scope limited to the two touched files, leaving the item's Task Breakdown and orchestration rows untouched per this dispatch's explicit instruction (G13, overridden by dispatch text "Don't tick the Task Breakdown").

## Adjacent files (subjective, not directly edited)

- `.cleargate/knowledge/cleargate-enforcement.md` — still names `cleargate-planning/MANIFEST.json` in two places (surface-whitelist seed list, forbidden-surfaces list); stale terminology post-STORY-058-01 but outside this bug's declared scope.
- `cleargate-cli/CHANGELOG.md` — no entry added (G10 says none required), but a later reader diffing shipped behavior against the changelog may expect one.
- `cleargate-cli/test/hooks/pre-tool-use-task.node.test.ts`, `test/hooks/token-ledger-attribution.node.test.ts`, `test/hooks/token-ledger-regression.node.test.ts` — the M0-step follow-up files that read canonical via `CLEARGATE_META_ROOT`; verified green under Rule 16 above, but worth a second look if a future item touches the sentinel/dispatch hooks again.

## flashcards_flagged

flashcards_flagged: []

No new surprises beyond what QA-Red and TPV already logged; the re-sealed contract (M3-A54..A60) reproduced exactly against my implementation with zero deviation, so I have nothing new to record.

STATUS=done
