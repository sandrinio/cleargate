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

## Rework 1 (qa_bounces=1, post-merge DevOps blocker)

Both halves merged (cli `main` `45bde09`, outer `sprint/S-41` `eef96600`, MANIFEST `5808e869`,
`dist` rebuilt). DevOps' post-merge full suite found 2 failures, both in
`test/scaffold/enforcement-doc-coherence.node.test.ts` Cluster 3: `Bug.md`'s new
`- SPIDR ← §5 SPIDR coverage table` Brief anchor does not resolve under that test's `resolves()`
function, because a `§N <title>` anchor's title part must be a case-insensitive substring of the
*actual* heading N's title text — heading 5 is `## 5. Verification Protocol (The Failing Test)`
(title `"Verification Protocol (The Failing Test)"`), and `"SPIDR coverage table"` shares no text
with it. Full details: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/reports/CR-123-devops-blockers.md`.

**Fix (outer `story/CR-123`, still checked out at `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-123`; cli untouched):**

- `cleargate-planning/.cleargate/templates/Bug.md` and its live-outer twin `.cleargate/templates/Bug.md`:
  `- SPIDR ← §5 SPIDR coverage table` → `- SPIDR ← §5 Verification Protocol (SPIDR coverage table)`
  — same pattern as the file's own pre-existing anchors (e.g. `Risks ← §4 Execution Sandbox
  (suspected blast radius)`): title part before the trailing parenthetical must literally overlap
  the real heading title.
- `cleargate-planning/.cleargate/templates/CR.md` and its live-outer twin `.cleargate/templates/CR.md`:
  proactively fixed the identical defect class (`- SPIDR ← §4 SPIDR coverage table` →
  `- SPIDR ← §4 Verification Protocol (SPIDR coverage table)`), even though the failing test only
  gates `Bug.md` today — CR.md's §4 is also a whole-number heading with the same title-overlap
  requirement, so it would trip the same way the moment Cluster 3 (or an equivalent) is extended to
  CR.md. Not fixing it now would just relocate this exact bounce to a future dispatch.
- `story.md`'s `- SPIDR ← §2.1 SPIDR coverage table` line was checked and deliberately left
  unchanged. Traced `resolves()` by hand (and confirmed with a scratch script): a `§N.M` anchor's
  numbered-heading match regex requires a **second literal dot** immediately after the decimal
  digit (`^${num}\.\s+` where `num` already contains `"2.1"`, so the built pattern demands a string
  shaped like `2X1.` followed by whitespace) — no real Markdown heading is ever written that way
  (`### 2.1 Acceptance Criteria (Gherkin)` has a space, not a second dot, after `2.1`). This means
  **every** decimal-numbered Brief anchor in story.md — including the three that predate CR-123
  (`Summary ← §1.1 User Story`, `Open Questions ← §1.4 Open Questions`, `Risks ← §1.5 Risks`) —
  already fails `resolves()` today, unconditionally, regardless of title wording. My new SPIDR line
  is exactly consistent with that pre-existing, untested convention; nothing in this CR introduced
  or worsened it, and no test currently gates story.md under Cluster 3 (only `REL.canonicalBug` /
  `REL.liveBug` are checked). Rewriting story.md's whole Brief-anchor convention is out of this
  rework's scope — flagging as a flashcard instead.
- No `## ` line was added to any file (`git diff` grep-checked, clean).

**Verification:**

- `CLEARGATE_META_ROOT=<worktree> npx tsx --test test/scaffold/enforcement-doc-coherence.node.test.ts`
  → **26/26 pass** (both previously-failing Cluster 3 Bug.md tests now green).
- Rule-16 sweep — every test file matching `grep -rl CLEARGATE_META_ROOT test | grep -v integration`
  (16 files), run once with the override through `run_script.sh`: **273 tests, 271 pass, 2 fail**,
  0 skipped. The 2 failures are both in `test/scripts/close-sprint-assume-ack-guard.node.test.ts`
  ("cli.ts --assume-ack option help string mentions CLEARGATE_CI_ACK" /
  "sprint.ts \"sprint not closed\" message mentions CLEARGATE_CI_ACK"): `ENOENT` on
  `<META_ROOT>/cleargate-cli/src/cli.ts` and `.../src/commands/sprint.ts`. That test hardcodes
  `CLI_TS = path.join(REPO_ROOT, 'cleargate-cli', 'src', 'cli.ts')` — it expects `REPO_ROOT` to have
  a nested `cleargate-cli/` sibling checkout, which **no outer worktree ever has** (cli work happens
  in the cli main checkout per Rule 9, never duplicated per-worktree; `.worktrees/CR-123` has zero
  `cleargate-cli/` files). This is not specific to CR-123 or to being behind `sprint/S-41` — it is a
  structural property of every outer worktree, matching FLASHCARD 2026-08-27 `#test-harness
  #cross-repo #danger` ("a worktree never materializes it"). Confirmed by running the same file with
  no override (defaults to the outer MAIN checkout, which does have `cleargate-cli/`):
  **20/20 pass**. Named per dispatch instruction 2; not fixed, not worked around.
- Did not run the full suite or `npm run build`, per dispatch instruction.

Commit: outer `story/CR-123` — "fix(CR-123): Bug.md Brief anchor resolves to §5 heading".

STORY: CR-123
STATUS: done
COMMIT: outer (see next commit on story/CR-123 for sha; cli untouched, still `45bde09` on `main`)
TYPECHECK: n/a (no cli change this round)
TESTS: enforcement-doc-coherence (override) 26 passed 0 failed; rule-16 sweep (16 files, override) 271 passed 2 failed 0 skipped — both failures are the pre-existing `close-sprint-assume-ack-guard.node.test.ts` worktree-topology ENOENT (confirmed 20/20 pass without the override, unrelated to this fix)
FILES_CHANGED: cleargate-planning/.cleargate/templates/Bug.md, .cleargate/templates/Bug.md, cleargate-planning/.cleargate/templates/CR.md, .cleargate/templates/CR.md, .cleargate/sprint-runs/SPRINT-41/reports/CR-123-dev.md (this file, Rework 1 section)
NOTES: One proactive addition beyond the named defect: fixed CR.md's identical SPIDR Brief-anchor
mismatch (not currently under test) alongside Bug.md's, to avoid an all-but-certain repeat bounce;
orchestrator_confirmed: false (my own call, flagged below). story.md's decimal-anchor convention was
investigated and left untouched — pre-existing, untested, unworsened by this CR.
r_coverage: []
plan_deviations:
  - { what: "Also fixed CR.md's SPIDR Brief anchor (§4 SPIDR coverage table -> §4 Verification Protocol (SPIDR coverage table)), which was not named in the DevOps blocker or the rework dispatch", why: "identical defect class to the named Bug.md failure — CR.md's §4 is also a whole-number heading with the same title-overlap requirement in resolves(), and leaving it would very likely produce a near-identical second bounce", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/scaffold/enforcement-doc-coherence.node.test.ts"
  - "cleargate-planning/.cleargate/templates/story.md"
  - ".cleargate/templates/story.md"
flashcards_flagged:
  - "2026-09-25 · #test-harness #readiness-gates · A §N Brief anchor's title part must textually overlap the real heading N title (resolves() in enforcement-doc-coherence.node.test.ts); inventing new anchor prose (e.g. \"SPIDR coverage table\") that names a subsection, not the heading, reads as unresolved."
  - "2026-09-25 · #test-harness #danger · resolves()'s §N.M numbered-heading regex needs a literal SECOND dot after the decimal digit, which no real heading ever has — every decimal-numbered Brief anchor (story.md's §1.1/§1.4/§1.5/§2.1) fails resolves() unconditionally regardless of title text; only whole-number anchors (Bug.md/CR.md) are structurally resolvable."
