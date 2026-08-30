# BUG-042 — Developer report

role: developer

STORY=BUG-042

## Preflight

Read (in order): `.cleargate/sprint-runs/SPRINT-39/sprint-context.md`, `.cleargate/sprint-runs/SPRINT-39/plans/M0.md` §BUG-042 (including all four `> **AMENDED 2026-08-27:**` blocks), `.cleargate/delivery/pending-sync/BUG-042_Gate_Section_Index_Off_By_Heading.md`, `.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red.md` + fixtures, and grepped `.cleargate/FLASHCARD.md` for `#gate`/`#readiness-gates`. Confirmed `pwd` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-042` (assigned worktree) before any edit.

Pre-edit line-number check (`grep -n` against the live tree) confirmed every line number in the plan's "Schema changes (verbatim)" section held exactly as documented: `:97` `scope-in-populated` `section(3)` (untouched, correct), `:99` `affected-files-declared` `section(5)`, `:170` `blast-radius-populated` `section(2)`, `:174` `sandbox-paths-declared` `section(3)`. Pre-edit `diff` between the two trees was empty (byte-identical), matching the plan's claim. No disagreement with the plan found — proceeded verbatim, no improvisation.

## The four edits, as applied

Applied identically to both `.cleargate/knowledge/readiness-gates.md` and `cleargate-planning/.cleargate/knowledge/readiness-gates.md`:

1. `:99` — `epic.affected-files-declared`: `section(5)` → `section(8)`.
2. `:170` — `cr.blast-radius-populated`: `section(2)` → `section(3)`.
3. `:174` — `cr.sandbox-paths-declared`: `section(3)` → `section(6)`.
4. After `:34` (the Predicate Vocabulary `section(<N>)` entry's two `Example:` sentences), inserted the vocabulary paragraph verbatim as given in M0.md — copy-pasted, not paraphrased.

`:97` (`epic.scope-in-populated`, `section(3)`) was **not** touched, per the plan's explicit instruction. `hotfix.md`'s three criteria were **not** "aligned" — the plan's trap 1 was heeded.

Final diff (identical in both files, verified via `diff <live> <canonical>` = empty):

```diff
@@ -33,6 +33,8 @@
 Example: `section(2) has ≥1 checked-checkbox` asserts that the second `##` section contains at least one checked markdown checkbox. Example: `section(3) has ≥1 declared-item` passes when §3 contains at least one bullet, table data row, or definition-list term.

+**`N` is a position, not a printed ordinal.** Sections are counted in document order over `## ` headings, so a template whose first heading is `## 0.5 Open Questions` or `## 0. AI Coding Agent Handoff` shifts every later section by one — and unnumbered headings (`## Existing Surfaces`, `## Prior work`, `## Why not simpler?`) consume positions too. `## 3. Execution Sandbox` in `CR.md` is `section(6)`, not `section(3)`. Inserting any `## ` heading into a gated template renumbers every criterion below it. The pinning test (`cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`) enumerates every `section(N)` criterion and asserts it resolves to the heading its id names — it is what turns that renumbering into a build break. Update the fixture there in the same commit as any template heading change.
+
 **4. `file-exists(<path>)`**
 ...
@@ -96,7 +98,7 @@
     - id: scope-in-populated
       check: "section(3) has ≥1 declared-item"
     - id: affected-files-declared
-      check: "section(5) has ≥1 declared-item"
+      check: "section(8) has ≥1 declared-item"
@@ -167,11 +169,11 @@
     - id: blast-radius-populated
-      check: "section(2) has ≥1 declared-item"
+      check: "section(3) has ≥1 declared-item"
     - id: no-tbds
       check: "body does not contain marker 'TBD'"
     - id: sandbox-paths-declared
-      check: "section(3) has ≥1 declared-item"
+      check: "section(6) has ≥1 declared-item"
```

## Two-tree parity proof

```
$ diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md
(no output — empty)
```

`git diff --stat` on the final commit touches exactly these two files, 8 insertions / 6 deletions each, symmetric line-for-line.

## Hard constraint checks

- `git diff --stat -- cleargate-cli/src/lib/readiness-predicates.ts` → empty. (`cleargate-cli/` does not materialize inside `.worktrees/BUG-042/` — confirmed empirically, matches FLASHCARD `#worktree #collision-surface #danger` — so this diff is trivially empty; the source of truth is that no edit was ever made to that file, which is also true in the main checkout where the file actually lives.)
- `git diff --stat -- .cleargate/templates/ cleargate-planning/.cleargate/templates/` → empty. No template touched.
- `git diff --stat -- .cleargate/delivery/archive/` → empty. No archive bulk re-gate.
- Final `git status --short` in the worktree after commit: clean.

## Typecheck / test

```
$ npm --prefix /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli run typecheck
> cleargate@0.24.2 typecheck
> tsc --noEmit
(no output — clean)

$ npm --prefix /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli test
...
ℹ tests 2479
ℹ suites 872
ℹ pass 2478
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 359464.226708
[exited with code 0]
```

0 failures, exit 0. No behavioral source changed, so this is a pure regression check (S7) — it passed. `test/docs/gate-section-index-pinning.node.test.ts` does not exist yet (confirmed) — that file is STORY-054-05's deliverable, correctly out of scope here.

Both commands were run against the **main checkout's** `cleargate-cli/` (`npm --prefix /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`), never `cd`, never `--workspace` — per sprint-context §Test Stack and FLASHCARD `2026-06-03 #gate #npm #workspace`. `cleargate-cli/` does not exist inside the worktree (BUG-046 collision-surface finding), so this is the only valid execution route, and it also matches R7's stated practice.

## Observed S1/S2/S4 flips — re-run of QA-Red's exact commands, with one correction

QA-Red's "Exact commands QA-Verify must re-run" section defines `FIX=/Users/.../ClearGate/.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/pre-fix` (the **main-checkout** path) and instructs `cd "$WT" && node "$CLI" gate check "$FIX/<fixture>.md" -v`.

**Finding, not a plan defect — an execution-route correction.** Run literally as written, this command does **not** exercise the fix. `resolveProjectRootForFile` (`cleargate-cli/src/lib/project-root.ts:82-90`) resolves the project root from an **absolute** file argument's own location by walking up from the file's directory — not from `cwd` — and `$FIX` under the plain outer `.cleargate/...` path resolves to the **main checkout** (still pre-fix), regardless of `cd`-ing into the worktree first. `cd "$WT"` only matters for **relative** paths. I verified this by running the literal command first: it returned the pre-fix green pass (`✅ cr.ready-to-apply passed (8 criteria)`), confirmed the main checkout's registry was still un-corrected (`section(5)` at `:99`), then re-ran against the **worktree's own copy** of the same fixtures (`$WT/.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/pre-fix/...` — the worktree branch already carries its own copy of these fixtures, fast-forwarded in with the plan). That is the correct reproduction route for a worktree-resident fix and is what the results below use. Flagging this for QA-Verify: use the worktree-local fixture copy, not the main-checkout path, when the fix lives in a worktree.

**S1 — bare `## 3. Execution Sandbox` (label deleted, zero paths):**
```
Gate: cr.ready-to-apply (enforcing)
❌ sandbox-paths-declared: section 6 has 0 declared-item (≥1 required)
  [pass] blast-radius-populated: section 3 has 3 declared-item (≥1 required)
  [fail] sandbox-paths-declared: section 6 has 0 declared-item (≥1 required)
  ...
EXIT=1
```
FLIPS from pre-fix green (8/8) to correctly FAILS at `section 6` (Execution Sandbox). `blast-radius-populated` now correctly reads `section 3` (Blast Radius) instead of the old wrong `section 2`. Matches BUG-042 §1 / M0.md exactly.

**S2 — empty `## 2. Blast Radius & Invalidation`:**
```
Gate: cr.ready-to-apply (enforcing)
❌ blast-radius-populated: section 3 has 0 declared-item (≥1 required)
  [fail] blast-radius-populated: section 3 has 0 declared-item (≥1 required)
  [pass] sandbox-paths-declared: section 6 has 2 declared-item (≥1 required)
  ...
EXIT=1
```
`blast-radius-populated` still correctly FAILS (now at the right section, `3`, not the old wrong `2`). `sandbox-paths-declared` now correctly PASSES at `section 6` (reads the populated Execution Sandbox, no longer misreads Blast Radius). Matches the plan.

**S4 — bare `**Affected Files:**` label, `**Data Changes:**` populated with a placeholder bullet:**
```
Gate: epic.ready-for-decomposition (enforcing)
✅ epic.ready-for-decomposition passed (12 criteria)
EXIT=0
```
Still PASSES 12/12 — **this is the documented, expected residue**, not a flip and not a defect in this fix. See below.

**S3 (bonus check, not required but re-ran for completeness) — empty `## 1. The Context Override`:**
```
Gate: cr.ready-to-apply (enforcing)
✅ cr.ready-to-apply passed (8 criteria)
EXIT=0
```
Now PASSES 8/8 — §1 is un-gated post-fix. Accepted per the plan's R2.

**Diagnostic corroboration (not part of QA-Red's four required scenarios, run for extra confidence against the real worktree fix — not the throwaway probe registry):** re-ran the three `post-fix-probe/` label-shape fixtures against the actual committed fix:
- `epic-s4b-empty-both.md` (both labels present, zero content) → PASSES 12/12. Matches documented residue.
- `epic-s4d-label-only.md` (label only, no Data Changes section at all) → PASSES 12/12. Matches documented residue.
- `epic-s4c-diagnostic-no-labels.md` (labels also deleted — genuinely empty §4) → **FAILS**: `affected-files-declared: section 8 has 0 declared-item`. Confirms the corrected index closes cleanly when the section is genuinely empty; the residue is `countDeclaredItems`'s bare-label counting (BUG-050), not the index.

Two-tree parity re-checked after all scenario runs (before the final commit): empty diff, confirmed. `cleargate gate check` writes `cached_gate_result` back into the frontmatter of every fixture it evaluates — this transiently modified the three `pre-fix/*.md` fixtures I ran against; those changes were **reverted** (`git checkout --`) before committing, since they are not part of BUG-042's declared file surface. The `post-fix-probe/*` fixtures showed no diff after being run (their `cached_gate_result` field content happened not to change).

## S1b / S4b — explicit confirmation of expected residue

Per the AMENDED shape-explicit scenarios: **S1b and S4b are expected to PASS, and this PASS is documented residue (R10 → BUG-050), not a regression and not a kick-back reason.**

- **S1b** (label-bearing `## 3. Execution Sandbox` — `**Modify:**` present, zero paths beneath): no dedicated fixture exists in the archived set for this exact shape (QA-Verify's job per the plan to author one). Not separately reproduced here — out of Developer scope, and the mechanism is already proven identical to the epic-side S4b/S4d cases below (a bare bold label alone satisfies `≥1 declared-item` in `countDeclaredItems`, `readiness-predicates.ts:712-763`, which is unmodified).
- **S4b-class** (epic, label-bearing, zero content beneath): confirmed directly above via `epic-s4b-empty-both.md` and `epic-s4d-label-only.md`, both against the real committed fix. Both PASS 12/12 as expected. **Not treated as a defect. Not "hardened."** No change was made to `countDeclaredItems`, the epic template, or any threshold to try to close this — that would violate the frozen-file constraint and the plan's explicit "do not compensate" instruction (a threshold bump can't work anyway: `epic.md` §4 ships two labels).

## Deviations from plan

None. All four edits landed exactly as specified, at the exact line numbers specified, with the vocabulary paragraph copied verbatim. The only departure from the dispatch's literal command list was the fixture-path correction described above (main-checkout path → worktree-local path) needed to make the *reproduction* actually exercise the fix — no file edit, template, or scope was changed as a result.

## Flashcard flagged

`resolveProjectRootForFile` roots on an **absolute** file argument's own on-disk location, not on `cwd`. QA-Red's captured reproduction commands point `$FIX` at the main-checkout copy of the fixtures; run literally post-fix (with `cd` into the worktree), they silently read the **main checkout's** un-corrected registry instead of the worktree's fix, producing a false "still green" result. The worktree carries its own copy of the same fixtures at `.worktrees/BUG-042/.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/`; pointing `$FIX` there instead reproduces correctly. Flagging for QA-Verify and for STORY-054-05 (which will build the automated pinning test and should not hard-code a main-checkout fixture path either). See `flashcards_flagged` below for the proposed one-liner.

## Summary

Three drifted `section(N)` indices corrected (5→8, 2→3, 3→6), vocabulary paragraph added, applied byte-identically to both trees. `evalSection` untouched. No template touched. No archive touched. Typecheck clean. Full `cleargate-cli` suite green (2479 tests, 0 fail, 1 pre-existing skip). S1/S2/S4 flip exactly as the plan predicts (once reproduced against the correct — worktree-local — fixture copies); S1b/S4b-class residue confirmed as expected, not acted on. One commit, `664d5036`.

STATUS=done
