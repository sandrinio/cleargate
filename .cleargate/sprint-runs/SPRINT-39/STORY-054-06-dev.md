# STORY-054-06 — Developer Report

role: developer

## Sequence followed (TPV Ruling D / R6, verbatim)

1. All edits made in the working tree first — cli src + cli tests (de-staling) + 6 templates
   (3 live + 3 canonical) + 2 registries (live + canonical). Nothing committed until both halves
   were present.
2. `npm --prefix cleargate-cli run typecheck` then the full suite, ONCE, with everything present.
   These are the report numbers below.
3. Commit A — `cleargate-cli`, staged by name (`src/lib/readiness-predicates.ts`,
   `test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts`).
4. State-touch: `update_state.mjs STORY-054-06 Bouncing` — no-op, already `Bouncing`.
5. Commit B — outer repo, staged by name (6 template files + 2 registry files).
6. `npm --prefix cleargate-cli run build` (N6) — dist rebuilt, `task-breakdown-complete`
   confirmed present in `dist/cli.js` (verified with `node -e content.includes(...)`, not grep —
   see SURPRISES).

Did not run the suite between steps 3 and 5, per R6.

## Implementation summary

- **`readiness-predicates.ts`**: added the `task-breakdown-complete` named closed-set predicate
  (union member, `parsePredicate` branch #10, `evaluate` switch case, `evalTaskBreakdownComplete`
  function appended at end of file). Locates `## Task Breakdown` via
  `body.split(/^(?=## )/m)` + `headingTitleOf` exact match (same pattern as
  `evalPriorWorkRecorded`), and counts `- [ ]`/`- [x]` rows **within the located section only**
  (TPV Ruling R3 — never over `doc.body`). Passes on section absence; fails, naming the gap, when
  present but row-free. `evalSection` (`:632-657` pre-edit numbering) is untouched — confirmed by
  `git diff` hunk boundaries (5 hunks, none overlapping that region).
- **Docstring correction**: `readiness-predicates.ts:3` "Supports exactly 6 closed-set predicate
  shapes" → **11** (not the plan's literal "10" — see PLAN DEVIATION below). Untested prose, no
  witness.
- **`readiness-predicates-prior-work-ambiguity.node.test.ts`**: de-staled all four sites named in
  §3.1 AMENDMENT #3 — the `:214-219`-region block comment, the `:274`-region test title, the
  `:356`-region test title, and the `:390-393`-region "documents nine shapes" comment. All
  retitled to name the SYNTHETIC in-test body explicitly and point at
  `gate-section-index-pinning.node.test.ts` S1b as the real post-054-06 witness. Assertions
  unchanged (per plan — these were stale-green, not red).
- **Templates**: inserted the verbatim §Schema-changes-(1) guidance block (`> `-prefixed on every
  line, zero line-initial `- `, zero TBD/TODO/FIXME, zero `SPRINT-<digits>` literal) into
  `story.md` (before `## 4. Quality Gates`), `CR.md` (before `## 4. Verification Protocol`), and
  `Bug.md` (before `## 5. Verification Protocol (The Failing Test)`) — live + canonical, byte-
  identical. One `<instructions>` sentence per template, index-free (inside `<instructions>`,
  stripped by `templateBodyOf`).
- **`readiness-gates.md`**: Predicate Vocabulary 9→10 + entry 10 (verbatim from plan). `dod-declared`
  `section(4)`→`section(5)` — the only `section(N)` value that moved. `task-breakdown-complete`
  appended to the `story`, `cr`, `bug` blocks, anchored on each block's `- id:
  ambiguity-gate-resolved` entry (TPV Ruling R8 — line-number anchors had drifted; anchored on the
  entry text via a Python line-splice, verified `check: "ambiguity-gate-resolved"` at each
  insertion point before writing). `epic` and `spike` blocks untouched.

## Verification performed

- `awk '/^## Task Breakdown/,/^## /' <file> | grep -n '^- '` — empty on all six template files
  (QA kick-back criterion 6).
- Heading position dump on all three edited templates matches TPV Ruling G / N4 exactly:
  story 1-9 (Task Breakdown=4, Quality Gates=5), CR 1-10 (Execution Sandbox=6, Task
  Breakdown=7, Verification=8), Bug 1-9 (Execution Sandbox=4, Task Breakdown=5, Verification=6).
- Four parity diffs (`story.md`, `CR.md`, `Bug.md`, `readiness-gates.md`, live vs canonical) —
  all silent, before AND after the edits.
- Targeted runs (diagnostic only, before either commit, not a second full-suite run):
  - `readiness-predicates-task-breakdown.red.node.test.ts` — **10/10, 0 fail, 0 skip**, file
    untouched.
  - `gate-section-index-pinning.node.test.ts` — **14/14**, S1a still "18 = 16 pinned + 2", S1b
    green (all pinnable criteria resolve to their fixture heading, incl. `story.dod-declared` now
    resolving via `section(5)` to `## 4. Quality Gates` — the fixture row needed zero edits since it
    is keyed on heading TEXT, not index), S3a/S3b green (single/double finding counts, no
    pollution), S6 unchanged.
  - `gate-unit.node.test.ts` — 25/25, "all criterion check strings ... parse" passes.
  - `readiness-predicates.node.test.ts` — 119/119.
  - `readiness-predicates-prior-work-ambiguity.node.test.ts` — 22/22 with the four retitled
    sites green.
- `git diff` hunk audit on `readiness-predicates.ts`: 5 hunks total (docstring, union member,
  parser branch, switch case, appended function) — none touch the frozen `evalSection` region.

## PLAN DEVIATION — docstring target number

M2 plan text says `readiness-predicates.ts:3` should read "→ 10" after this story. Measured: the
`ParsedPredicate` union already had **10** members *before* this story (frontmatter, body-contains,
marker-absence, section, file-exists, link-target-exists, status-of, existing-surfaces-verified,
prior-work-recorded, ambiguity-gate-resolved — the stale "6" was already off by 4, matching the
plan's own "stale by four" observation: 10-6=4). Adding `task-breakdown-complete` as an 11th member
makes "10" arithmetically wrong post-edit; I set it to **11**. This line carries no test witness
(plan confirms: "does not touch :640/:646/:648, so S4 stays green" — S4 doesn't pin this string
either), so there is no functional risk, but I am flagging it as a unilateral correction rather
than silently diverging from the literal instruction.

## Script Incidents

None. No script was invoked outside the `run_script.sh` wrapper requirement's scope — this story's
commands are `npm`, `git`, `node update_state.mjs`, and `npm run build`, none of which are ad hoc
bash/node scripts requiring the wrapper.

---

STATUS: done
COMMITS: a7f1c66 (cleargate-cli) / 33c56974 (outer)
SUITE: 2526/2524/1/1 — only the pre-existing sync.node.test.ts network failure remains. (Dispatch's stated target "2526/2525/1/1" has an internal arithmetic inconsistency — 2525+1+1=2527≠2526 — and does not match its own stated baseline math: baseline 2526/2516/9/1, minus 8 fixed reds = 2524 pass/1 fail/1 skip, which is what I measured.)
TYPECHECK: pass
QA_RED_FILE: 10/10 with zero edits — confirmed untouched (git diff shows no changes to `test/lib/readiness-predicates-task-breakdown.red.node.test.ts`; not renamed either, per the Do-NOT-touch list).
PREDICATE: `body.split(/^(?=## )/m)` + `headingTitleOf` exact-match locator (evalPriorWorkRecorded's pattern), counting `- [ ]`/`- [x]` rows WITHIN the located section string only (never over `doc.body`), per TPV Ruling R3.
INDEX_BUMP: dod-declared section(4)->section(5) confirmed in both `readiness-gates.md` trees (live + canonical), byte-identical.
CORPUS_FLIP: left the 74/231 flip alone — did not revert the index, did not migrate the archive. Confirmed via S1a/S1b/S3a/S3b all green on the corrected index.
HEADING: `## Task Breakdown` — unnumbered, identical in all 6 template files (3 live + 3 canonical). Verified never `## 9. Task Breakdown` (QA kick-back #8) — the literal S3a/S3b synthetic mutation string does not appear anywhere in the real templates.
GUIDANCE_BLOCK: verbatim `> `-prefixed on every line in all 6 files; `awk`/`grep '^- '` check empty on all 6; zero fenced or indented checkbox illustration (the `` `- [ ] <action>` `` example stays inline inside a `> ` blockquote line, per TPV Ruling R9).
STALE_SITES: 4/4 fixed in `readiness-predicates-prior-work-ambiguity.node.test.ts` — the block comment, both test titles, and the "nine shapes" comment (now "ten shapes"). All 22 tests in that file still pass.
N6_BUILD: ran — `npm --prefix cleargate-cli run build` succeeded, `dist/cli.js` mtime is now newer than the source edits, `dist/cli.js` confirmed to contain `task-breakdown-complete` (verified via `node -e fs.readFileSync(...).includes(...)` since `grep -c` unreliably exits 1 on this file — see SURPRISES). Zero commits from the build (`dist/` gitignored in cli repo, confirmed via `git status --porcelain` showing no dist entries).
UNTOUCHED: `test/lib/readiness-predicates-task-breakdown.red.node.test.ts` (0 diff, 0 rename) · `expected-headings.ts` (0 diff, needed none — heading TEXT unchanged by the index bump) · `gate-section-index-pinning.node.test.ts` (0 diff) · `KNOWN_UNPINNABLE` (unchanged, size still 2) · block censuses at `gate-unit.node.test.ts` and `readiness-predicates.node.test.ts` (both still read 11 blocks — I added criteria to existing blocks, not a new block) · S4/S7 (untouched, both still green) · `evalSection` (0 diff on that region, confirmed by hunk-boundary audit) · no `cleargate wiki` command run · no EPIC-058 file touched · `.cleargate/sprint-runs/SPRINT-39/plans/M2.md`, `state.json`, wiki files, other pending-sync BUG/CR/EPIC files, `cleargate-planning/MANIFEST.json` — all left exactly as found (staged nothing from them; git status still shows them modified/untracked by the other session, untouched by my two commits).
SURPRISES: (1) The outer repo's actually-installed pre-commit hook (`pre-commit-surface-gate.sh`) does NOT itself run `npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test` — it only runs the red-test-immutability check, `check:no-vitest`, `check:no-inline-id-regex`, and `file_surface_diff.sh`. The "registry-first fails its own pre-commit hook" claim in the M2 plan (N7) is not literally what the installed hook enforces today; my manual typecheck+suite run before either commit was the actual load-bearing verification, which the dispatch already required regardless. Outcome-neutral (order was correct either way) but worth a flashcard for anyone relying on N7's hook-enforcement claim as a safety net. (2) BSD `grep -c`/`grep -l` on `dist/cli.js` silently exits 1 (no match, no error text) despite the string being present — `file` reports "very long lines (498)" and BSD grep appears to choke on it. Verified presence with `node -e fs.readFileSync(...).includes(...)` instead. Not a defect in my work, but a tooling trap for any QA-Verify step that reaches for `grep -c task-breakdown-complete dist/cli.js` as its N6 evidence per QA kick-back criterion 10's spirit.
