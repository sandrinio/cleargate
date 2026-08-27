# BUG-042 — QA-Verify report

role: qa

STORY=BUG-042

## Preflight

Read `sprint-context.md` (Cross-Cutting Rules 1-5, Test Stack), `plans/M0.md` §BUG-042 (all four AMENDED 2026-08-27 blocks + Cross-story risks R1/R2/R10), grepped FLASHCARD.md for `#gate #readiness-gates #worktree` (hit the fixture-path trap card verbatim, plus — discovered mid-verification — `2026-06-04 #test #run_script #isolation`, see Script Incidents). Worktree: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-042`, branch `story/BUG-042` @ `664d5036`, base `sprint/S-39` @ `771fcf26`.

## The change itself

`git show --stat 664d5036`: exactly 2 files, `.cleargate/knowledge/readiness-gates.md` and `cleargate-planning/.cleargate/knowledge/readiness-gates.md`, 8 insertions / 6 deletions each, line-for-line identical. `git diff --stat sprint/S-39..HEAD` confirms the same two files and nothing else — no template, no `readiness-predicates.ts`, no archive.

Three index edits verified present and correct:
- `:99` `epic.affected-files-declared` → `section(8)`
- `:170` `cr.blast-radius-populated` → `section(3)`
- `:174` `cr.sandbox-paths-declared` → `section(6)`
- `:97` `epic.scope-in-populated` (`section(3)`) confirmed **unchanged** (not in the diff).
- `hotfix.md`'s three criteria (`section(2)/(3)/(4)`) confirmed **not touched** — not in the diff at all.

Vocabulary paragraph: diffed the plan's verbatim text against live line `:36` char-for-char — **exact match**. Canonical (`cleargate-planning/...`) line `:36` diffed against live line `:36` — **exact match**.

Two-tree parity: `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` → empty (S6, confirmed).

## Independent resolution derivation (not copied from the plan's table)

Read `evalSection` at `cleargate-cli/src/lib/readiness-predicates.ts:632-657` directly (not from memory) and replicated its exact split/preamble/index logic in a standalone script (`body.split(/^(?=## )/m)`, `hasPreamble = !rawParts[0].startsWith('## ')`, `arrayIndex = hasPreamble ? N : N-1`). Confirmed `ParsedDoc.body` is `parseFrontmatter(raw).body` (`cleargate-cli/src/wiki/parse-frontmatter.ts`) — post-frontmatter body, matching my script's frontmatter strip. Ran it against the shipped templates:

| Criterion | N | Resolves to | Heading the id names | Match |
|---|---|---|---|---|
| `epic.affected-files-declared` | 8 | `## 4. Technical Grounding (The "Shadow Spec")` | same | ✅ |
| `epic.scope-in-populated` | 3 | `## 2. Scope Boundaries` | same (unchanged, correct) | ✅ |
| `cr.blast-radius-populated` | 3 | `## 2. Blast Radius & Invalidation` | same | ✅ |
| `cr.sandbox-paths-declared` | 6 | `## 3. Execution Sandbox` | same | ✅ |

**Independent derivation agrees with the plan's table on all four rows — no disagreement.** As a corpus cross-check (not required, done for confidence) I also replayed `section(8)` over all 14 pending-sync epics and `section(3)`/`section(6)` over all 25 pending-sync CRs — results below under R1 corpus sanity — both match the plan's parenthetical claims exactly.

## Scenario table — observed vs. expected (worktree-local fixtures only)

**Trap confirmed first, deliberately.** Ran the QA-Red-captured literal command (`$FIX` = main-checkout path) against `cr-s1-empty-sandbox.md` from inside the worktree: returned `✅ cr.ready-to-apply passed (8 criteria)` — the stale pre-fix result, because `resolveProjectRootForFile` roots on the fixture's own on-disk location (main checkout, still uncorrected — verified `.cleargate/knowledge/readiness-gates.md:99/174` in the main checkout still read `section(5)`/`section(3)`). Confirms the dispatch's warning and the Developer's finding. All results below use the **worktree-local** fixture copies (`$WT/.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/...`).

| # | Fixture | Observed | Expected | Result |
|---|---|---|---|---|
| S1 | `pre-fix/cr-s1-empty-sandbox.md` (bare `## 3. Execution Sandbox`, `**Modify:**` deleted) | `❌ sandbox-paths-declared: section 6 has 0 declared-item`; `blast-radius-populated` now reads `section 3` correctly | FAIL at section 6 | ✅ matches |
| S1b | `post-fix-probe/cr-s1b-label-only-sandbox.md` (authored by me — re-added bare `**Modify:**` to S1's fixture, no paths beneath) | `✅ cr.ready-to-apply passed (8 criteria)` | PASS 8/8, expected residue (R10/BUG-050) | ✅ matches, not kicked back |
| S2 | `pre-fix/cr-s2-empty-blast-radius.md` | `❌ blast-radius-populated: section 3 has 0 declared-item`; `sandbox-paths-declared` `✅` at `section 6` (2 items) | blast FAILS at §2, sandbox PASSES at §3 | ✅ matches |
| S3 | `pre-fix/cr-s3-empty-context-override.md` (empty §1) | `✅ cr.ready-to-apply passed (8 criteria)` | PASS — §1 un-gated post-fix (R2, accepted) | ✅ matches |
| S4 | `post-fix-probe/epic-s4c-diagnostic-no-labels.md` (bare §4, **both** labels deleted — this is the amended-S4 fixture per M0.md line 149, distinct from the pre-fix/epic-s4-empty-affected-files.md fixture named in QA-Red's original command list) | `❌ affected-files-declared: section 8 has 0 declared-item` | FAIL at section 8 | ✅ matches |
| S4b | `post-fix-probe/epic-s4b-empty-both.md` + `epic-s4d-label-only.md` (labels present, zero content) | both `✅ epic.ready-for-decomposition passed (12 criteria)` | PASS 12/12, expected residue (R10/BUG-050) | ✅ matches, not kicked back |
| S5 | — | `git diff --stat sprint/S-39..HEAD -- cleargate-cli/src/lib/readiness-predicates.ts` empty | empty | ✅ |
| S6 | — | `diff` of both trees | empty | ✅ |
| S7 | — | typecheck clean, full suite green | see below | ✅ |

**One labeling note, not a defect.** `epic-s4-empty-affected-files.md` (referenced by QA-Red's original "exact commands" list and by the Developer's write-up as "S4") is actually a hybrid shape — `**Affected Files:**` bare but `**Data Changes:**` populated with a real bullet (`- Table/Entity: none`) — giving 2 declared items at both the old wrong index (`## Existing Surfaces`, also 2 items) and the corrected index. It does **not flip** (passes both pre- and post-fix) and is therefore not diagnostic for the fix either way. I ran it for completeness (`✅ 12/12`, consistent with its non-discriminating shape) but it is not the scenario the amended plan calls "S4" — the amended plan explicitly retargets S4 at `epic-s4c-diagnostic-no-labels.md` (M0.md:149), which I used above and which correctly flips. The Developer ran and reported both fixtures; their "Diagnostic corroboration" paragraph correctly identifies `epic-s4c-diagnostic-no-labels.md` as the one that closes cleanly — the underlying evidence is complete, only the section label in their write-up is loose. Not a kickback reason.

Ran `cached_gate_result` write-backs on tracked pre-fix fixtures reverted (`git checkout --`) after evaluation, matching the Developer's own practice; worktree left clean apart from the untracked dev report and my authored S1b fixture.

## Gates

```
$ npm --prefix cleargate-cli run typecheck
> cleargate@0.24.2 typecheck
> tsc --noEmit
(clean, no output)
```

**Full suite (unwrapped, matching the sprint's designated Test Stack command `npm --prefix cleargate-cli test`):**
```
ℹ tests 2479
ℹ suites 872
ℹ pass 2478
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 345968.856916
```
Matches the Developer's reported counts exactly. Confirmed the single skip is `emits phase4: JSON signal when no stub is provided` in `test/wiki/contradict-cli.node.test.ts`, gated on `{ skip: !process.env['CLEARGATE_E2E'] }` — an E2E-only test, unconditional on this fix, present in the codebase since well before this sprint (`git log` on that file's last touching commit predates SPRINT-39). Genuinely pre-existing, not new residue.

## Script Incidents

One incident written during my *first* full-suite attempt, run through the mandated `run_script.sh` wrapper: `.cleargate/sprint-runs/SPRINT-39/.script-incidents/20260827T091122Z-18fba2b157e2.json` (exit_code 1). Root cause: `run_script.sh` exports `RUN_SCRIPT_ACTIVE=1` into its own environment; wrapping `npm test` through it leaks that var into the `npm test` child process, which in turn leaks into `test/scripts/run-script-wrapper.red.node.test.ts`'s own nested `run_script.sh` invocations — those hit the wrapper's self-exemption guard (`run_script.sh:41`) and skip writing incident JSON, so 4 of that file's assertions ("No incident files found") false-fail. This is a **pre-existing, already-flashcarded** interaction (`2026-06-04 · #test #run_script #isolation` — "Invoke `npm test` DIRECTLY when measuring the suite or testing run_script.sh behavior"), which I initially missed on my tag-scoped grep (`#gate #readiness-gates #worktree`) and rediscovered the hard way. Confirmed by re-running the affected file alone with `RUN_SCRIPT_ACTIVE` unset (18/18 pass) and then the full suite unwrapped (2478/2479 pass, matches Developer). **Not a BUG-042 regression** — a QA-invocation artifact, corrected before forming the verdict. No new flashcard needed (dupe of the existing card); citing it instead.

## R1 corpus sanity (independent replay)

Replayed `section(8)` over all 14 pending-sync epics with my own script (not the plan's table):

```
EPIC-012: ## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
EPIC-030/044/046/047/048/050: ## 5. Acceptance Criteria
EPIC-031: section 8 not found (body has 7 sections)
EPIC-052/053/054/055/056/057: ## 4. Technical Grounding (The "Shadow Spec")  <-- HIT (6/14)
```
6/14 hit the named heading; EPIC-031 hard-fails as predicted. Ran `gate check` directly against `EPIC-054_Spike_And_Task_Decomposition_Surfaces.md`: `[pass] affected-files-declared: section 8 has 19 declared-item` — confirms R1's "EPIC-054 passes at section(8), 19 declared items, verified" exactly (the same command also failed on `existing-surfaces-verified`, but that's a worktree-materialization artifact — the cited `cleargate-cli/src/lib/*.ts` paths don't exist inside `.worktrees/BUG-042/` per the collision-surface flashcard — unrelated to BUG-042). Reverted the `cached_gate_result` write-back on that file afterward.

Bonus (not required, ran for extra confidence): replayed `section(3)`/`section(6)` over all 25 pending-sync CRs — `blast-radius-populated` resolves correctly 25/25; `sandbox-paths-declared` resolves correctly 23/25, missing only CR-083 and CR-085 (land on `## 4. Verification Protocol` instead). Matches the plan's R1 parenthetical exactly. This residue is accepted per BUG-042's recorded lazy-re-check decision; not treated as a regression, no softening proposed, no archive bulk-edit performed.

## Known traps checked

- `hotfix.md`'s three criteria — confirmed **not present in the diff at all** (not "aligned").
- `epic.scope-in-populated` (`:97`) — confirmed **not present in the diff** (untouched).
- `git diff --stat sprint/S-39..HEAD -- cleargate-cli/src/lib/readiness-predicates.ts` — empty.
- No `.cleargate/templates/**` or `.cleargate/delivery/archive/**` touched.

## STORY: STORY-BUG-042
QA: PASS
TYPECHECK: pass
TESTS: 2478 passed, 0 failed, 1 skipped (full suite, unwrapped `npm --prefix cleargate-cli test`)
ACCEPTANCE_COVERAGE: 8 of 8 scenarios have matching evidence (S1, S1b, S2, S3, S4, S4b, S5, S6, S7 — 9 counted individually; all present)
MISSING: none
REGRESSIONS: none
CORPUS_RESIDUE: EPIC-031 hard-fails post-fix `section 8 not found` (R1, accepted, out of scope); 8/14 epics and 2/25 CRs drift off their corrected index on the real corpus (R1, accepted); label-bearing empty sections still pass ≥1 threshold on both corrected criteria (R10/BUG-050, accepted, out of scope) — confirmed via S1b/S4b, not treated as a defect.

flashcards_flagged: []

## VERDICT

STATUS=pass

BUG-042 lands exactly the four edits the plan specifies, byte-identical across both trees, with zero drift into `evalSection`, templates, or the archive. My own independent replay of the evaluator's split/preamble/index logic — read directly from `readiness-predicates.ts:632-657`, not copied from the plan — agrees with the plan's resolution table on all four pinned rows and confirms `epic.scope-in-populated` and `hotfix.md` were correctly left alone. Re-running S1/S2/S3/S4 against worktree-local fixtures (never the main-checkout path, which I independently reproduced as silently stale) shows the exact flips the amended plan predicts, and the S1b/S4b label-bearing shapes — one authored fresh for this pass — PASS as the documented, accepted BUG-050 residue rather than being mistaken for either "fail-open still open" or "criterion over-hardened." The corrected-index corpus residue (EPIC-031's hard fail, the 8/14 and 2/25 drift counts) reproduces the plan's R1 figures exactly under independent replay. Typecheck is clean and the full suite is green at 2478/2479 with the single skip confirmed as a pre-existing, unrelated `CLEARGATE_E2E`-gated test — after correcting for a self-inflicted, already-flashcarded false-failure caused by running the test command through the incident-capture wrapper (documented above, not charged against the Developer). **The sprint's declared 9/12 → 12/12 metric is met**: all three corrected criteria now resolve to the heading their id names, and the previously-correct ninth (`scope-in-populated`) remains correct. Ship it.
