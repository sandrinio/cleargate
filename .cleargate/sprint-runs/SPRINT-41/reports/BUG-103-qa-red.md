role: qa

# BUG-103 QA-Red Report — sprint-execution skill drift (SPRINT-41 M7)

**Mode:** RED — write failing tests against Bug §5 Gherkin / M7.md §3 pinned passages. No
implementation Read access beyond what M7.md §3 itself quotes verbatim (the plan is the binding
spec per the Task Breakdown note); no implementation Write at all.

**Commit:** `story/BUG-103` @ `833b6a4` in `<cw>` =
`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-103/cleargate-cli`
(parent: cli main `f0c33f7`). Test-only commit — `git show --stat 833b6a4` touches exactly:

```
test/helpers/init-fixture.ts                              | 39 +++++++++++++++--
test/scaffold/sprint-execution-skill-drift.red.node.test.ts | 348 +++++++++++++++
```

No implementation file (`.mjs`, `.md` doc, `.toml`) was Read-and-quoted beyond the exact
passages M7.md §3 itself already reproduces verbatim, and none was edited.

## QA-RED: WRITTEN

RED_TESTS:
- `test/scaffold/sprint-execution-skill-drift.red.node.test.ts` (new; naming per
  sprint-context.md §Test Stack — `*.red.node.test.ts`)

BASELINE_FAIL: 19 of 20 leaf assertions (node:test `ℹ fail 19`), plus 3 additional
`SANCTIONED_BASELINE_DELTAS` row assertions in `test/helpers/init-fixture.ts` (exercised by the
pre-existing M2-pair integration files, not counted in this file's own leaf total — see
"M2 pair" below).

## Per-file table

| File | Kind | Change | Solo result |
|---|---|---|---|
| `test/scaffold/sprint-execution-skill-drift.red.node.test.ts` | new red test | 7 named scenarios (T1–T7), 20 node:test leaf assertions (T1/T2/T3/T5 loop over 2–4 render targets each) | `npm run test:file` → `ℹ tests 20 / pass 1 / fail 19` (exit 1) |
| `test/helpers/init-fixture.ts` | shared test helper edit | +1 new `SANCTIONED_BASELINE_DELTAS` row (`BUG-103` / `.cleargate/scripts/validate_bounce_readiness.mjs`, baseline `e4c6bead…bacbd6ff`); +1 chained refusal branch each on the existing `CR-124` rows for `.claude/agents/architect.md` (`51f30ec4…d1eb03`) and `.claude/skills/sprint-execution/SKILL.md` (`cecf1700…82cf3bc0`), per the M3-A54 convention (append, never replace/duplicate) | `npm run typecheck` clean; row behavior verified directly (see below) and via the M2 pair |

**Baseline-fail breakdown (leaf level, `sprint-execution-skill-drift.red.node.test.ts`):**

| Test | Targets | Result | Reason |
|---|---|---|---|
| T1 | Claude SKILL.md, Codex SKILL.md × 3 checks each | 6 fail | none of "cleargate sprint init SPRINT-NN --stories", "Five automated checks", "run_script.sh node .cleargate/scripts/" exist yet |
| T2 | Claude SKILL.md, Codex SKILL.md | 2 fail | no "Orchestrator bookkeeping is:" / "chore(SPRINT-NN):" text yet |
| T3 | Claude SKILL.md, Codex SKILL.md, Claude dispatch-serial.md, Codex dispatch-serial.md | 4 fail | no "main checkout's absolute" text yet |
| T4 | Claude SKILL.md, Codex SKILL.md (§C.9 lead only — see Scope note) | 2 fail | serial-host carve-out sentence absent |
| T5 | Claude SKILL.md, Codex SKILL.md, architect.md, architect.toml | 4 fail | "one serial wave, and it is still written" / "where you also write the one-wave" absent |
| T6 | validate_bounce_readiness.mjs, wiki-only dirt | 1 fail | script currently treats ANY porcelain output as dirty (no wiki filter) |
| T7 | validate_bounce_readiness.mjs, real dirt under src/ | **1 pass** | regression guard — this behavior already works and must keep working; see BASELINE FAIL CONTRACT comment in the file header |

## Scope note on T4 (I16 split, OD-M7-3)

M7.md §3's Test list for T4 reads: "the canonical §C.9 lead carries the serial-host sentence,
and the Codex render contains **Per-dispatch gate.**". The collision matrix gives the
"**Per-dispatch gate.**" text sole ownership to BUG-101 (it is R4 in
`CODEX_SKILL_REPLACEMENTS`, `build-codex-payload.mjs:284` — a *different*, later §C.9 passage
than the lead sentence BUG-103 owns), pinned by BUG-101's own Test 31 (OD-M7-3). I scoped my T4
to assert only the lead-sentence text BUG-103 actually owns, on both the canonical file and the
regenerated Codex copy (the lead sentence is plain prose, not one of the R1–R6 anchors, so it
should pass through the renderer unmodified — confirmed by direct inspection of
`CODEX_SKILL_REPLACEMENTS`). I did **not** assert "Per-dispatch gate" anywhere, to avoid
duplicate/conflicting test ownership of BUG-101's anchor text. Flagging this explicitly for
Architect TPV rather than silently narrowing scope.

## Regression witnesses (solo, per M7.md §3 "Regression witnesses" row)

```
npm run test:file -- test/scaffold/portable-skills.red.node.test.ts \
  test/scaffold/codex-payload.red.node.test.ts \
  test/docs/contract-first-dag-text.red.node.test.ts \
  test/scripts/collision-surface-planning-workflow.red.node.test.ts \
  test/scripts/codex-sprint-execution-render.red.node.test.ts \
  test/commands/init-codex-sprint-execution.red.node.test.ts
→ ℹ tests 51 / pass 51 / fail 0 (exit 0)

npm run test:file -- test/scaffold/sprint-execution-mirror.integration.node.test.ts
→ ℹ tests 4 / pass 4 / fail 0 (exit 0) — expected GREEN today (live `.claude` symlink still
  matches canonical; this test is "Named build-phase red until RS-M7b" per M7.md §3 — it will
  go red once the Developer edits canonical SKILL.md, and stays red until DevOps re-syncs
  live at boundary step RS-M7b).
```

No regression in any named witness.

## M2 pair (CLEARGATE_INIT_BASELINE)

```
CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline \
  npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts
→ ℹ tests 5 / pass 0 / fail 5 (exit 1)
```

All 5 `INIT_SCENARIOS` now fail at the **first** `SANCTIONED_BASELINE_DELTAS` row hit
(`BUG-103` / `validate_bounce_readiness.mjs` — array order puts it before the two edited
`CR-124` rows), confirming the new row is red for the right reason:

```
AssertionError: sanctioned delta ".cleargate/scripts/validate_bounce_readiness.mjs" (BUG-103):
current hash mismatch at scenario "fresh" (equal to the baseline hash means the delta has not
landed or was reverted)
+ actual:   e4c6bead578a75a4f62fddbc1bccd40e92cc64f6136b3f893bb7cf50bacbd6ff
- expected: '<BUG-103 validate_bounce_readiness.mjs delta not landed: canonical still ...>'
```

Because `assert.strictEqual` throws at the first mismatched row per scenario, this run does not
independently exercise the two edited `CR-124` rows. I verified those directly by importing
`SANCTIONED_BASELINE_DELTAS` and calling each row's `currentHash('fresh')` in a throwaway
(deleted) script:

```
BUG-103  .cleargate/scripts/validate_bounce_readiness.mjs => <BUG-103 ... not landed: ... e4c6bead...>
CR-124   .claude/agents/architect.md                       => <CR-124 architect.md delta not landed: ... 51f30ec4...>
CR-124   .claude/skills/sprint-execution/SKILL.md           => <CR-124 SKILL.md delta not landed: ... cecf1700...>
```

All three refuse the pre-fix canonical bytes as intended (M3-A54 convention); all three will
resolve to the real post-fix hash once the Developer's commit + `npm run gen:codex` land.

## Rule 16 (CLEARGATE_META_ROOT)

**Not triggered.** My new test file reads only cli-side canonical assets via `canonicalPath`/
`SCAFFOLD_ROOT` (`scaffold/core`, `scaffold/hosts/claude`, `scaffold/hosts/codex`) — none of it
reads `CLEARGATE_META_ROOT` or any outer-worktree doc. `test/helpers/init-fixture.ts`'s edits
route through the same `currentPinSubstitutedHash()`/`canonicalPath()` helper already in use by
every other row in that array — no new META_ROOT dependency. No `CLEARGATE_META_ROOT` sweep was
run, per the dispatch's own conditional ("if your tests read META_ROOT docs").

**Forward note for Developer/QA-Verify:** BUG-103 *does* touch the twin
`.cleargate/scripts/validate_bounce_readiness.mjs` in the outer repo (Rule 10: a canonical
`.cleargate/{templates,knowledge,scripts}` edit is a cli `scaffold/core` edit plus the outer
live-mirror edit in the same item). I confirmed the outer twin at `<ow>` is byte-identical to
canonical today (`diff` clean). Once the Developer edits canonical and byte-copies the outer
twin, Rule 16 **will** apply to their pass and to QA-Verify's re-run: run every file returned by
`command grep -rl CLEARGATE_META_ROOT cleargate-cli/test` with `CLEARGATE_META_ROOT=<ow>` (25
files as of this commit; I did not run this sweep myself since the condition wasn't met on my
own diff).

## D4 delta

M7.md §2.3 projects BUG-103 at merge position #4 with **+7** default-tier tests (projected total
3678/3676 at that point in the merge order, assuming STORY-058-13 + BUG-101 + BUG-100 + BUG-047
have already merged ahead of it). My cli worktree is still based on cli main `f0c33f7` (no other
M7 item has merged into it), so I measured the file in isolation rather than against a moving
projected total.

**Discrepancy:** my file's actual `ℹ tests` count is **20**, not 7. The plan's "+7" figures
count named scenarios (T1–T7) at the same one-row-per-item granularity the §2.3 merge-order
table uses throughout M7, not the node:test leaf-assertion count — T1/T2/T3/T5 each loop over
2–4 render/file targets, registering one `test()` per target. Per M7.md §3's own instruction
("QA-Red records each file's actual `ℹ tests` count; DevOps uses QA-Red's final numbers"):
**DevOps should use 20, not 7, as this file's contribution to the running default-tier total.**
`test/helpers/init-fixture.ts`'s edits add 0 new node:test leaf tests directly (it is a shared
helper, not a test file); the 3 new/edited `SANCTIONED_BASELINE_DELTAS` rows are exercised only
by the pre-existing M2-pair integration files, which package.json already excludes from the
default-tier `npm test` glob — no default-tier count impact from that edit.

## Other scope decisions (not silent)

- **Twin byte-parity for `validate_bounce_readiness.mjs` is NOT added to
  `test/scripts/serial-twins.red.node.test.ts`.** That file's `RELS` array (owned by
  STORY-058-12 QA-Red) covers `launch_wave.mjs` / `dispatch_serial.mjs` / `flashcard-gate.mjs`
  only. M7.md §3's Task Breakdown row for BUG-103 asks only for the new
  `SANCTIONED_BASELINE_DELTAS` row + the CR-124 refusal-hash appends — twin byte-parity is
  handled at the boundary-step level instead (§5's boundary table: "twin
  `.cleargate/scripts/validate_bounce_readiness.mjs`; a real transition first," a DevOps/rule-15
  concern). I left `serial-twins.red.node.test.ts` untouched to avoid taking on scope not asked
  for and not colliding with STORY-058-12/BUG-102's ownership of that file.
- **T6/T7 harness mechanics:** `validate_bounce_readiness.mjs` derives `REPO_ROOT` from its own
  file location (`path.resolve(__dirname, '..', '..')`), not `process.cwd()`, and imports
  `./validate_state.mjs` (which imports `./constants.mjs` and `./state-events.mjs`) by relative
  path. T6/T7 copy all four files into a constructed temp git repo (`.cleargate/scripts/`) and
  spawn the copy there — never the canonical copy in place — so the git-dirty check runs
  against a controlled fixture, not this cli repo's own working tree. Confirmed working (imports
  resolve, `git status --porcelain` reads correctly) in the solo run above.

## Discrepancies vs plan (summary)

1. D4 count: report 20 (actual), not 7 (plan's scenario-count convention) — see above.
2. T4 scope narrowed to BUG-103's own lead-sentence text; BUG-101's "Per-dispatch gate" text
   deliberately not asserted (OD-M7-3 ownership) — see "Scope note on T4" above.
3. No `serial-twins.red.node.test.ts` extension — deliberate, see "Other scope decisions" above.
4. Rule 16 not triggered on my own diff (condition not met) — forward note left for
   Developer/QA-Verify.

None of these touch an implementation file; all are test-file/scope decisions surfaced here for
Architect TPV and orchestrator visibility rather than made silently.

## Script Incidents

None. No `run_script.sh`-wrapped invocation was made (only `npm run test:file`, `npm run
typecheck`, and direct `git`/`node` calls inside the test fixtures themselves, per the QA-Red
dispatch's own script-invocation scope — none of this dispatch's work ran through the
orchestrator-dispatched script wrapper).

flashcards_flagged:
  - "2026-09-27 · #qa-red #test-harness #scripts · A .cleargate/scripts .mjs derives REPO_ROOT from its own file; copy it + sibling deps into a temp git repo to test it."
  - "2026-09-27 · #test-harness #qa-red #scaffold · Two items sharing one SANCTIONED_BASELINE_DELTAS row chain currentHash refusals; append, never replace or duplicate."
