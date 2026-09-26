role: devops

# C2 DevOps Report — contract/S-41-dispatch

```
CONTRACT: C2 (contract/S-41-dispatch)
STATUS: done
C2_SHA: 8c8c5ffedf5e7402506ca7370ab33891549cf354
MERGES: story/STORY-058-11@44ba381 (5d690d5, clean, no-ff) + story/CR-124@e22a408 (421cb6b, 1 conflict: test/helpers/init-fixture.ts, row-level resolved) + regen commit (8c8c5ff, 3 files)
REGEN: npm run gen:codex changed only scaffold/hosts/codex/.codex/agents/{architect,architect-synth,architect-reader}.toml (allow-list respected)
TESTS: prebuild/build/typecheck/--check all green; owners' make-green sets 190/193 (3 named-red, all explained, no code fix); M2 parity pair 5/5 + 15/15; verify-pack 222 files / payload 83 (unchanged)
```

## 1. Preflight

Read `sprint-context.md` (Sprint Goal, Cross-Cutting Rules 9-21, Mid-Sprint Amendments through the CR-124 re-plan). Read `plans/replan-contract-first.md` §2 contracts table (C2 row) + "C2 build rules" (~line 164) + §7.5 (shared enforcement-row spec). Read `STORY-058-11-dev.md`, `STORY-058-11-tpv.md` §7 K3, `CR-124-dev.md`, `CR-124-qa.md`. Grepped `FLASHCARD.md` for `#merge #init-fixture #codex #devops` — hit line 32: "init-fixture row append/append conflicts split into interleaved hunks; rebuild tail: upstream rows, then own." (directly applicable, followed).

Verified pre-existing state before touching anything:
- `git -C OUTER/cleargate-cli worktree list` showed C2 cli worktree at `.worktrees/contract-S-41-dispatch/cleargate-cli` on `contract/S-41-dispatch` at `d0f0d95` (= C1).
- `node_modules` symlink and `.claude` symlink both present and correct.
- Both `git status --porcelain` (cli worktree and outer host) empty before starting.
- CLI main checkout confirmed untouched (on `main` at `984e8d5`, not queried further — BUG-090's DevOps merge lane in use).

## 2. Step 1 — Merge story/STORY-058-11 Dev 44ba381

```
git -C <c2> merge --no-ff 44ba381 -m "contract(C2): merge story/STORY-058-11 Dev 44ba381"
```
Clean, fast-forwardable, `--no-ff` forced a merge commit as expected. Result: `5d690d53ab09769b4d2b427292ee5b2d38b05866`. 64 files changed, 7537 insertions(+), 115 deletions(-). No conflicts.

## 3. Step 2 — Merge story/CR-124 Dev e22a408 (the allowed conflict)

```
git -C <c2> merge --no-ff e22a408 -m "contract(C2): merge story/CR-124 Dev e22a408"
```
Exit 1. `git status --porcelain` showed exactly one conflicting file: `test/helpers/init-fixture.ts` (`UU`). `CHANGELOG.md` and `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` auto-merged cleanly (git's own 3-way merge resolved them — both entries/lines landed with no marker). No other conflict appeared; per the C2 build rules this is the one sanctioned conflict class.

**Byte-identity check on the shared enforcement row** (before resolving): extracted the object literal (13 lines, `{ item: 'STORY-058-11+CR-124', … },`) from both `:2:` (ours) and `:3:` (theirs) via `git show :2:test/helpers/init-fixture.ts` / `:3:`. `diff` reported no difference; `shasum -a 256` on both gave the identical `2203a6405406444013cfacd4312f92f6f977a16fe6a3f54df1e075c257be5fe8` — matches the dispatch's expected `2203a640…` prefix exactly. Confirmed byte-identical before deleting one copy.

**Resolution (row-level, not per-hunk).** The conflict was 7 interleaved hunks (git split single-row insertions on both sides into alternating fragments because both sides inserted at the same array position). Reconstructed the full tail by row, not by hunk:

Before (both sides diverging after the shared BUG-085 rows, `item: 'BUG-085'` / `.cleargate/scripts/validate_state.mjs`):
```
<<<<<<< HEAD (3× STORY-058-10 rows, then 4× STORY-058-11 rows, comment, shared-row comment)
=======
(6× CR-124 rows, interleaved with HEAD's rows across 6 markers, then CR-124's own shared-row comment)
>>>>>>> e22a408
```
Final hunk (array close + STORY-058-11's SANCTIONED_BASELINE_ADDITIONS section, present only on HEAD's side):
```
<<<<<<< HEAD
]);
// ── STORY-058-11: SANCTIONED_BASELINE_ADDITIONS … export interface SanctionedAddition { … }
export const SANCTIONED_BASELINE_ADDITIONS = Object.freeze([ { item: 'STORY-058-11', rel: '.claude/hooks/lib/harness.sh', … } ,
=======
>>>>>>> e22a408
```
(theirs contributes nothing here — CR-124's branch predates the SANCTIONED_BASELINE_ADDITIONS mechanism, so it doesn't exist on that side at all.)

After (row-level rebuild, verified with `command grep -n "item: '" test/helpers/init-fixture.ts`):
```
STORY-058-10  ×3   (pre-edit-gate.sh, stamp-and-gate.sh, token-ledger.sh)   — kept from HEAD (C1's own rows, only side that has them)
STORY-058-11  ×4   (session-start.sh, pre-tool-use-task.sh, pre-tool-use-autonomy.sh, pre-commit-surface-gate.sh) — kept from HEAD, contiguous
CR-124        ×6   (architect.md, architect-synth.md, architect-reader.md, SKILL.md, launch_wave.mjs, Sprint Plan Template.md) — kept from theirs, contiguous, immediately after -11's rows
STORY-058-11+CR-124  ×1  (cleargate-enforcement.md) — ONE copy kept (theirs' comment text retained, since it now sits immediately after CR-124's own rows); the duplicate HEAD-side copy of the row+comment deleted
]);   — closes SANCTIONED_BASELINE_DELTAS
// ── STORY-058-11: SANCTIONED_BASELINE_ADDITIONS … (unchanged, HEAD-only section, left byte-identical)
]);   — closes SANCTIONED_BASELINE_ADDITIONS (this line was already common/unconflicted in the working file)
```
No conflict markers remain (`command grep -n "<<<<<<<\|=======\|>>>>>>>"` → 0 hits). Array-close count verified: `command grep -n "^]);"` → lines 115 (unrelated earlier array), 752 (SANCTIONED_BASELINE_DELTAS), 814 (SANCTIONED_BASELINE_ADDITIONS) — both arrays close exactly once, no stray brace.

Staged and committed: `421cb6bxxxxxxx` "contract(C2): merge story/CR-124 Dev e22a408" — 12 files changed, 1096 insertions(+), 44 deletions(-).

No other conflict resolution class was needed (no `*.red.*` test conflict, no non-identical sanctioned row) — did not invoke the abort/halt path.

## 4. Step 3 — Regenerate codex agent TOMLs

```
cd <c2> && npm run gen:codex   # node scripts/build-codex-payload.mjs --write
```
Script reported "wrote" 19 files (it always rewrites its full output set), but `git status --porcelain` after the run showed content actually changed in only:
```
 M scaffold/hosts/codex/.codex/agents/architect-reader.toml
 M scaffold/hosts/codex/.codex/agents/architect-synth.toml
 M scaffold/hosts/codex/.codex/agents/architect.toml
```
All 19 other rewritten files (hooks, other agent TOMLs, portable skills) were byte-identical re-writes — no diff, nothing to commit. This matches the allow-list (`scaffold/hosts/codex/.codex/agents/architect*.toml` only); no halt condition triggered.

Committed only the 3 changed files: `8c8c5ff` "contract(C2): regenerate codex agent TOMLs after CR-124 (npm run gen:codex)" — 3 files changed, 80 insertions(+), 28 deletions(-). Worktree clean after commit.

## 5. Step 4 — Build verification

- `npm run prebuild` in `<c2>`: composed 83-file `cleargate-planning` payload + 102-file scaffold split view + 77-file MANIFEST.json. Includes an internal `build-codex-payload.mjs --check` pass (part of the prebuild chain) — no error.
- `npm run build > /private/tmp/c2-build.log 2>&1`: exit 0. Tail of log shows clean tsup ESM + DTS build, `dist/cli.js` 626.49 KB, MANIFEST.json copied to dist.
- `npm run typecheck`: `tsc --noEmit`, exit 0, no output.
- `node scripts/build-codex-payload.mjs --check` (standalone): exit 0.

## 6. Step 5 — Owners' make-green sets (solo, `npm run test:file`)

Counts via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`.

### STORY-058-11 K3 set

| File | tests | pass | fail | Expected | Match |
|---|---|---|---|---|---|
| codex-agents-codegen.red.node.test.ts | 30 | 30 | 0 | 30/30 | yes |
| portable-skills.red.node.test.ts | 6 | 6 | 0 | 6/6 | yes |
| harness-shim.red.node.test.ts | 18 | 18 | 0 | 18/18 | yes |
| codex-enforcement-delta.red.node.test.ts | 15 | 0 | 15 | 15/15 | **NO — named-red, see §6a** |
| codex-hooks-harness.red.node.test.ts | 84 | 84 | 0 | 84/84 | yes |
| init.node.test.ts | 34 | 34 | 0 | 34/34 | yes |
| hooks-snapshots.node.test.ts | 16 | 16 | 0 | 16/16 | yes |
| lifecycle-codex.red.node.test.ts | 6 | 6 | 0 | 6/6 | yes |

Anchors: init-host-snapshot 13/13, codex-payload 14/14, pre-tool-use-task 13/13, stamp-and-gate 7/7, session-start 9/9, cr-026-integration 1/1, pre-commit-downstream-safe 12/12 all match. `file-surface-gate-e2e.node.test.ts` 20/21 — **NO — named-red, see §6a**. Integration `hooks-claude-parity.red.integration.node.test.ts`: 19/19, matches.

### CR-124 set

| File | tests | pass | fail | Expected | Match |
|---|---|---|---|---|---|
| waves-json-v2.red.node.test.ts | 7 | 7 | 0 | 7/7 | yes |
| contract-first-dag-text.red.node.test.ts | 10 | 8 | 2 | 10/10 | **NO — named-red, see §6a** |
| init-sprint-waves-v2.red.integration.node.test.ts | 1 | 1 | 0 | 1/1 | yes |

### M2 parity pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare-only, env read-only)

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`: 5/5.
- `test/commands/init-host-parity.red.integration.node.test.ts`: 15/15.

### verify-pack

`node scripts/verify-pack.mjs`: `[verify-pack] OK — 222 files, payload 83, version 0.26.1.` — unchanged from STORY-058-11's own solo report (`222/83`); no new dependency, no payload drift.

### §6a — 3 named-red, re-run once each (flake rule), all deterministic, all same root cause

All three re-ran identically on a second solo pass (not flaky):

1. `codex-enforcement-delta.red.node.test.ts`: 15 failures, all "§16 section not found" / assertion-not-met on required substrings.
2. `file-surface-gate-e2e.node.test.ts`: 1 failure — "cleargate-enforcement.md is byte-identical between canonical and live-root".
3. `contract-first-dag-text.red.node.test.ts`: 2 failures — T4 ("canonical/live cleargate-enforcement.md byte-identical") and T5 ("canonical/live Sprint Plan Template byte-identical").

**Root cause (not a code regression):** all three read an "outer live" path via `REPO_ROOT = process.env.CLEARGATE_META_ROOT ? … : path.resolve(CLI_ROOT, '..')`. With no `CLEARGATE_META_ROOT` override (correct — the dispatch never asked for one, and setting it for a non-single-file run would violate the "never for the full suite" flashcard rule's spirit), `CLI_ROOT/..` resolves to the **C2 outer host** — `OUTER/.worktrees/contract-S-41-dispatch` — which is a bare `--detach sprint/S-41` checkout with **no story-specific outer commits**. Confirmed: `git -C OUTER/.worktrees/contract-S-41-dispatch log --oneline -1` = `79e3d139` (STORY-058-11's own report-commit event on `sprint/S-41`, not a merge of -11's outer twin), and `command grep -n "^## " …/cleargate-enforcement.md` on that outer host tops out at `## 15.` — no `§16`. Per rule 21 / the M6/CR-124 plan, each item's outer-twin edits (`.cleargate/knowledge/cleargate-enforcement.md` §16 addition, `Sprint Plan Template.md` §2.1 rewrite) live **uncommitted in that item's own `<ow>` worktree** (`.worktrees/STORY-058-11`, `.worktrees/CR-124`) until that item's own DevOps merge + BD boundary step — which has not run yet for either item. C2 is a **cli-only** contract build (its own outer host is just a detached ref, never touched by this dispatch, which the dispatch text explicitly forbids committing to). These 3 tests are therefore structurally red in any cli-only contract-build context until the individual items' own outer twins land on `sprint/S-41` — they are not evidence of a merge defect in C2's cli-side work. Per plan §2's "Any other conflict halts C2" — this is not a conflict, and per rule 5 of my dispatch ("re-run solo once, then report it — do not fix code") I have not touched any code, test, or the outer host to "fix" this.

No other test outside this named set failed. Nothing hidden.

## 7. Frozen-export presence at C2 (grep, file:line)

**STORY-058-11:**
| Export | Location |
|---|---|
| `PORTABLE_SKILLS` | `scripts/build-codex-payload.mjs:75` |
| `planCodexPayload` | `scripts/build-codex-payload.mjs:264` (core function; called at :296, :328) |
| `TIER_RULES` `.codex/agents/**` row | `src/lib/manifest-builder.ts:59` (array), pattern at `:275` |
| `TIER_RULES` `.agents/skills/**` row | `src/lib/manifest-builder.ts:288` |
| `cg_repo_root` | `scaffold/hosts/claude/.claude/hooks/lib/harness.sh:30` (doc comment at :10, :14) |
| `SanctionedAddition` interface | `test/helpers/init-fixture.ts:763` |
| `SANCTIONED_BASELINE_ADDITIONS` | `test/helpers/init-fixture.ts:802` |
| `codex.live.roles` / `codex.live.skills` | `scripts/clean-room/evidence.mjs:715-716` (array), `:1088-1089` (verdict wiring) |
| enforcement §16 heading | `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md:590` |

**CR-124:**
| Export | Location |
|---|---|
| `storyBases` | `scaffold/core/.cleargate/scripts/launch_wave.mjs:119` |
| `integrationReady` | `scaffold/core/.cleargate/scripts/launch_wave.mjs:133` |
| `launchWave({…, bases})` | `scaffold/core/.cleargate/scripts/launch_wave.mjs:290` (`bases = {}` param; `baseFor` helper at :295) |
| SKILL.md §A.4 | `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:169` |
| SKILL.md §C.0.2 | `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:291` |
| The 7 init-fixture rows | `test/helpers/init-fixture.ts:644,659,674,689,706,721` (6× `CR-124`) + `:740` (shared `STORY-058-11+CR-124` row) |

## 8. C2 tip + re-freeze hashes

```
C2 tip (git -C <c2> rev-parse HEAD): 8c8c5ffedf5e7402506ca7370ab33891549cf354
sha256  scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:
  e7c730efde50df072e6eccffc6b48764e55c19ab8706dae376208a644d35c797
sha256  scaffold/core/.cleargate/scripts/launch_wave.mjs:
  090881968a62b40b4ad5da2c1471d1588654c86f05da696294d0adc17a4080ee
```

## 9. Teardown

- `git -C <c2> status --porcelain` → empty.
- `git -C OUTER/.worktrees/contract-S-41-dispatch status --porcelain` → empty (no `.claude` leak — it's excluded via `.git/info/exclude` per the DAG's step 2).
- `git -C OUTER/cleargate-cli worktree remove OUTER/.worktrees/contract-S-41-dispatch/cleargate-cli` — cli first, exit 0. Confirmed absent from `git -C cleargate-cli worktree list`.
- `git -C OUTER worktree remove .worktrees/contract-S-41-dispatch` — exit 0. Confirmed absent from `git worktree list`.
- Branch `contract/S-41-dispatch` **kept**, tip `8c8c5ff` — confirmed via `git -C cleargate-cli branch --list contract/S-41-dispatch -v`.

## Script Incidents

None. Every command in this dispatch ran directly (git, npm, node) — none went through `run_script.sh` (no `.cleargate/sprint-runs` script was invoked), so no incident directory entries were produced.

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #worktree #test-harness · A cli-only contract worktree (C2) has no outer twin: canonical/live-parity tests are named-red there until each item's own DevOps+BD lands."
```
