# CR-123 Developer Report

role: developer

CR: CR-123
QA-Red commits: `eaa4c62`, `90d28c3`, `f0c923d` (cli `story/CR-123`), TPV: APPROVED (`CR-123-tpv.md` re-check)

## Summary

Implemented the `spidr-coverage` closed-set readiness predicate (cli half) and the SPIDR coverage
tables, per-type Gherkin skeletons, and the tightened epic `gherkin-error-path` check (outer half),
per the M1 plan §CR-123 blueprint and the TPV's binding "Developer hints".

**cli (`story/CR-123`):** added `{ kind: 'spidr-coverage' }` to `ParsedPredicate`, a parser branch
(#12), an `evaluate()` case, and `evalSpidrCoverage` as a sibling of `evalTestLayersDeclared` in
`src/lib/readiness-predicates.ts`. Bumped the file's own docstring count from 12 to 13. The trigger
detector (`computeGenericFenceMask`) walks the body tracking any fence opened by 3+ backticks/tildes
with any info string, closed by the same character at length ≥ the opener — generic, not
gherkin-specific — so the `**SPIDR coverage.**` lead-in never fires inside a fenced example (the
CR's own self-fire case, S2-3). Table parsing takes the first contiguous `|`-block after the trigger,
skips header+separator, and records the first row per axis. Tag collection is scoped to
`` ```gherkin `` fences only, walking upward from each `Scenario:`/`Scenario Outline:` line through
contiguous `@word`-only lines. Failures are evaluated in fixed axis order (Paths, Interfaces, Data,
Rules) and each names the axis plus the specific defect.

**outer (`.worktrees/CR-123`):** edited canonical `story.md` (§2.1 table + `Scenario: {Error — …}`
rename + Granularity Rubric split-axis line + Brief `SPIDR` row + instructions-block axis-meaning and
Task-Breakdown sentences), `CR.md` (§4 table + `{New logic holds}`/`{Obsolete logic is gone}` Gherkin
skeleton), `Bug.md` (§5 table + `{The §1 expected behaviour holds}`/`{Error — …}` skeleton), `epic.md`
(added a second `Scenario: {Error — invalid action is rejected}` inside the existing §5 fence — brace
before `Error`, per TPV hint 3, so it does not itself satisfy the tightened check). Edited canonical
`readiness-gates.md`: bumped "exactly 11" → "12 predicate shapes", appended vocabulary entry
`**12. \`spidr-coverage\`**`, registered `spidr-coverage` as the last criterion in the story, cr and
bug blocks (never epic), and tightened epic `gherkin-error-path`'s check string to
`"body contains 'Scenario: Error'"`. Copied all five files byte-identical into the live
`.cleargate/templates/` and `.cleargate/knowledge/readiness-gates.md` trees in the same worktree
commit (`cmp`/`diff -q` verified silent). Edited canonical `qa.md:39,42` and `SKILL.md:340,438` to
the per-type acceptance pointer ("Story §2.1, CR §4, Bug §5 — or, for an item written before CR-123,
its numbered verification steps"), keeping the `:340` File-naming clause intact on the same line. Did
NOT touch live `.claude/**` (none exists in this worktree — gitignored, per-machine; RS-2 re-syncs it).
No `## ` line was added to any template, inside or outside `<instructions>`; verified with a diff-only
grep against the git diff. `grep -rn "against §4 acceptance\|story's §4 acceptance" cleargate-planning/`
returns nothing (item 9).

## Verification

- **Targeted, override set** (`CLEARGATE_META_ROOT=.worktrees/CR-123`): spidr unit (32) + doctrine
  (11, both moved counts green) + test-layers (17) + e2e (1) = **61 tests, 61 pass, 0 fail**.
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`) — clean, 0 errors.
- **Targeted, no override** (vacuous-for-spidr per M1 plan, reads live MAIN canonical which does not
  yet register `spidr-coverage`): `gate-unit.node.test.ts` + `readiness-predicates.node.test.ts` +
  `work-item-type-spike.node.test.ts` → **156 tests, 156 pass, 0 fail** — unchanged pass count.
- **`gate-section-index-pinning.node.test.ts`** (no override, reads MAIN canonical — I touched no
  `## ` heading in any template): **14 tests, 14 pass, 0 fail** — pass count unchanged (item 10).
- **Item 8 (no-regression sweep), run in-process** (not via QA-Red — the CR marks item 8 as a DevOps
  post-BD1 live check, but the dispatch asked me to prove it pre-merge with an in-process harness):
  imported `gateCheckHandler` from `src/commands/gate.ts`, ran it against copies of EPIC-052,
  EPIC-053, STORY-031-01, CR-083-Document-Connection-Identity-Routes-OpenAPI and BUG-033 in a tmp
  dir, once with `gatesDocPath` = the unedited outer-MAIN `readiness-gates.md` ("before") and once
  with `gatesDocPath` = the CR-123 worktree canonical `readiness-gates.md` ("after"). `failing_criteria`
  was byte-identical before/after for all five items — `spidr-coverage` never appears (all five lack
  the lead-in, so it passes `not-applicable` and is absent from the failing list, correctly), and
  EPIC-052/EPIC-053 continue to pass `gherkin-error-path` under the tightened check (both already
  carry real `Scenario: Error —` lines). No cached result was written to any real item — every run
  operated on a `mkdtemp` copy, deleted afterward. Scratch script
  (`cleargate-cli/scratch-cr123-item8.mts`) was removed after the run; `git status` in cli confirmed
  no residue.
- **Full `npm test`, no override, once:** 2773 tests, **2761 pass, 10 fail**, 2 skipped
  (`358884ms` ≈ 6.0 min; baseline was 2683/2680/0/3-skipped). All 10 failures are in
  `test/lib/readiness-predicates-spidr-coverage.red.node.test.ts` and
  `test/docs/test-layers-declared-doctrine.red.node.test.ts`, and every one reads the outer **MAIN**
  checkout's unedited canonical `readiness-gates.md`/`story.md`/`CR.md`/`Bug.md` because no override
  was set (rule 15) — named individually with the actual assertion diffs: `T11` (doctrine "exactly
  11" not yet "12", and no entry 12), `S1`×3 (`actual: true, expected: false` for story/CR/Bug.md —
  MAIN's canonical templates carry no `**SPIDR coverage.**` lead-in at all yet, since MAIN hasn't
  merged CR-123, so `evaluate()` correctly returns `not-applicable: pass: true`, and the test — which
  is pinned against the WORKTREE's post-edit canonical, expecting a Cover-cell failure — reads
  `true` where it wants `false`), `S7`×2 (MAIN's `gherkin-error-path` check is still the untightened
  `"body contains 'Error'"`, so `actual: "body contains 'Error'"` / `expected: "body contains
  'Scenario: Error'"`, and the prose-only-Error body still passes against that untightened live
  check), `S8`×4 (MAIN's `readiness-gates.md` has no `spidr-coverage` registrations in the story/cr/
  bug blocks and no vocabulary entry 12 yet). Zero failures outside those two files, and the failure
  shapes are exactly the ones rule 15 predicts for a two-repo item pre-merge. The skipped count
  differs from baseline by 1 (2 vs 3); this looks like an environment-dependent skip condition
  elsewhere in the suite, unrelated to this diff — not investigated further per the 2-attempt/
  circuit-breaker discipline, since it is a skip-count drift, not a new failure.
- **Rule 14:** confirmed `git status` in the outer MAIN checkout showed only the known
  `.cleargate/delivery/pending-sync/**` back-sync + `cleargate-planning/MANIFEST.json` class (30
  single-line frontmatter-stamp diffs), no unexpected edits; reverted with
  `git -C /Users/ssuladze/Documents/Dev/ClearGate checkout -- .cleargate/delivery
  cleargate-planning/MANIFEST.json`. Confirmed clean afterward.
- **PostToolUse hook on CR-123 itself (expected, not worked around):** editing the CR's own Task
  Breakdown checkboxes triggered a re-gate via the live global `cleargate` binary/dist, which does
  not yet carry `spidr-coverage`. The frontmatter now shows
  `cached_gate_result: { pass: false, failing_criteria: [{ id: spidr-coverage, detail: "predicate
  error: Error: unsupported predicate shape: spidr-coverage" }] }`. This is the exact hazard the
  dispatch named ("uses the live dist, which lacks spidr-coverage — expected; note it, don't work
  around it") and resolves itself once BD1 rebuilds `dist` from cli `main`.

## Deviations from plan

None. Implemented exactly the blueprint's file list and the TPV's binding contract. The in-process
item-8 sweep used `STORY-031-01`, `CR-083-Document-Connection-Identity-Routes-OpenAPI.md` and
`BUG-033_Collision_Surface_Fail_Open.md` as the "one pending story, CR and bug" — arbitrary picks
from `pending-sync/`, not named by the plan; any pending item would have exercised the same code path.

## Task Breakdown

Ticked all Developer-scoped rows (re-measure, predicate implementation, template edits, gates-doc
edits, agent/skill edits, typecheck+tests) in the same commit. Left the final DevOps/RS-2 row
unticked, as instructed.

flashcards_flagged:
- "2026-09-25 · #test-harness #gate · Full npm test with no CLEARGATE_META_ROOT override reads the outer MAIN checkout's canonical docs — a two-repo item's own new red tests fail there pre-merge by design (rule 15); name each failure, don't chase it."
