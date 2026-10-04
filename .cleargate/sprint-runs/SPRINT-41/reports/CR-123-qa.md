# CR-123 QA-Verify

role: qa

## Mode

VERIFY — read-only acceptance trace against CR-123 §1 (Old vs New), §3 Execution Sandbox, §4
Verification Protocol and M1 plan §CR-123. No file writes except this report; no git writes
anywhere. Inputs: cli `story/CR-123` at Dev `3f562c3` (QA-Red `eaa4c62`/`90d28c3`/`f0c923d` frozen
underneath), outer `.worktrees/CR-123` at Dev `3d5e8e90`.

## 1. Test re-run (TPV's command set)

```
CLEARGATE_META_ROOT=.worktrees/CR-123 npm run test:file -- \
  test/lib/readiness-predicates-spidr-coverage.red.node.test.ts \
  test/docs/test-layers-declared-doctrine.red.node.test.ts \
  test/lib/readiness-predicates-test-layers-declared.red.node.test.ts \
  test/e2e/spidr-coverage.red.integration.node.test.ts
```
Result: **61 tests, 18 suites, 61 pass, 0 fail** — matches TPV's expected 61/61 exactly.

`npm run typecheck`: clean, 0 errors.

`gate-section-index-pinning.node.test.ts` (no override, reads outer MAIN canonical): **14 tests,
14 pass, 0 fail** — pass count unchanged from Dev's report, confirming no `## ` heading was added
to any of the four templates.

**Rule-15 spot check (no override, reads outer MAIN unedited canonical):** re-ran
`readiness-predicates-spidr-coverage.red.node.test.ts` + `test-layers-declared-doctrine.red.node.test.ts`
with no `CLEARGATE_META_ROOT`. Result: **43 tests, 33 pass, 10 fail** — the exact count and the
exact failure names the Dev report lists (T11 doctrine count; S1×3 canonical story/CR/Bug.md;
S7×2 registered-check-string + prose-fails-against-live-check; S8×4 story/cr/bug registration +
vocabulary entry). Confirmed mechanism: every failure reads outer MAIN's pre-merge canonical
(`readiness-gates.md` still says "exactly 11" with no `spidr-coverage` entry, no epic-check
tightening) — not a real defect in the Developer's diff. No full-suite re-run performed, per
dispatch instruction (DevOps runs it after both halves merge).

## 2. Acceptance trace

**Predicate implementation** (`cleargate-cli/src/lib/readiness-predicates.ts`, story-branch source):
- `ParsedPredicate` union member, parser branch (`// 12. spidr-coverage`), `evaluate()` case, and
  `evalSpidrCoverage` all present. Docstring bumped 12 → 13 (`:3`).
- Trigger: `computeGenericFenceMask` — a generic fence tracker (3+ backticks/tildes, any info
  string, closed by same char at length ≥ opener) gates the column-0 `**SPIDR coverage.**` match.
  Confirmed generic, not gherkin-specific — the exact self-fire guard the CR requires.
- Table: first contiguous `|`-block after the trigger, header+separator skipped, first row per
  axis wins (duplicate rows not treated as a failure mode, matching the CR's exhaustive list).
- Failures, in fixed axis order (Paths, Interfaces, Data, Rules), each naming the axis: missing
  row; Cover cell not exactly `T`/`F`; `F` + empty Reason; `T` + no tagged scenario; `F` + tagged
  scenario. Matches §4 items 1, 3, 4 exactly.
- Tags: collected only inside ` ```gherkin ` fences, directly above `Scenario:`/`Scenario Outline:`,
  via contiguous `@word`-only lines walking upward — matches §4 item 5 (fence-scoped).
- `doc.body` only — no `doc.fm`/`absPath` reference in `evalSpidrCoverage`; confirmed by the S8
  fm-branching test passing.
- Registered as the **last criterion** in the story (`ready-for-execution`), cr (`ready-to-apply`)
  and bug (`ready-for-fix`) blocks; **absent from both epic blocks** (`ready-for-decomposition` and
  `ready-for-coding`) — grepped directly, 0 hits inside either epic yaml fence.

**Templates** (canonical `cleargate-planning/.cleargate/templates/{story,CR,Bug,epic}.md`):
- Bold `**SPIDR coverage.**` lead-ins present in story §2.1, CR §4, Bug §5 — never a `## ` heading.
- `## ` heading list identical before/after CR-123 in all four templates (diffed against
  `sprint/S-41` tip — same headings, same order, only line-number shifts from inserted content).
  `gate-section-index-pinning` staying at 14/14 (no override) independently confirms MAIN is
  unaffected pre-merge; the heading-list diff confirms the worktree's own edit introduces no new
  `## ` line either.
- CR §4 and Bug §5 gained Gherkin skeletons (`Scenario: {New logic holds}` /
  `{Obsolete logic is gone}` for CR; `{The §1 expected behaviour holds}` / `{Error — …}` for Bug).
- Story §2.1 error scenario renamed to `Scenario: {Error — invalid action is rejected}`.
- Epic gained a second `Scenario: {Error — invalid action is rejected}` skeleton inside the
  existing §5/§6 fence, brace before `Error` (TPV hint 3) — confirmed it does not itself satisfy
  the tightened check (S7-4 passes: unedited epic.md still fails; only a real
  `Scenario: Error — x` line — not the braced placeholder — passes).
- Instructions blocks: axis-meaning prose, Task-Breakdown sentence ("no row is written for an axis
  marked F"), Granularity Rubric split-axis line, and the Brief `SPIDR ←` row all present in all
  three templates. No `` ```gherkin `` fence with tags anywhere inside any `<instructions>` block
  (grepped — zero hits).

**`readiness-gates.md`** (canonical, both trees): vocabulary count "exactly 11" → "12 predicate
shapes"; new entry `**12. \`spidr-coverage\`**`; epic `ready-for-coding`'s `gherkin-error-path`
check string tightened to `"body contains 'Scenario: Error'"` (id unchanged). No new gate block —
block count stays 11, confirmed by `gate-section-index-pinning` and `gate-unit`/
`readiness-predicates.node.test.ts` staying at their pre-merge pass counts (M1 plan `:110-115`,
"vacuous for spidr" — confirmed by Dev's report, 156/156 unchanged).

**`qa.md` / `SKILL.md` per-type pointer:** diffed each file against `sprint/S-41` tip — `qa.md`
changed only lines 39 and 42; `SKILL.md` changed only lines 340 and 438. Both now read "the
acceptance Gherkin — Story §2.1, CR §4, Bug §5 — or, for an item written before CR-123, its
numbered verification steps." Line 340's File-naming clause (`*.red.node.test.ts` /
`*.red.integration.node.test.ts`, immutable post-Red) is intact on the same line, word-for-word
unchanged from before the edit.

**Item 9 (evicted pointer gone):** `grep -rn "against §4 acceptance\|story's §4 acceptance"
cleargate-planning/` in the outer worktree returns nothing. (Historical hits exist under
`.cleargate/sprint-runs/`, `.cleargate/wiki/` and `.cleargate/delivery/archive/` — old sprint
artifacts/wiki pages from SPRINT-22/39 predating this CR — which is outside the CR's declared grep
scope of `cleargate-planning/ .claude/` and is not evidence of an unfixed live pointer.)

**Mirror parity (item 11):** `cmp` on all five canonical/live pairs — `templates/{story,CR,Bug,
epic}.md` and `knowledge/readiness-gates.md` — all silent (byte-identical).

**Live `.claude/` untouched:** the real repo-root `/Users/ssuladze/Documents/Dev/ClearGate/.claude/agents/qa.md`
and `.../skills/sprint-execution/SKILL.md` carry mtimes of Aug 30 2026 — unchanged since before
this sprint's work began. The outer worktree diff against its merge-base with `sprint/S-41`
touches exactly 17 files (CR-123 body + report artifacts + the 5 canonical/live template+gates
pairs + `qa.md`/`SKILL.md` + wiki-ingest byproducts of editing the CR body) — no `.claude/` path
among them, consistent with the CR's own statement that the live `.claude/` copies don't exist in
this gitignored, per-machine worktree and are re-synced by the orchestrator at RS-2.

**Note on branch divergence (not a CR-123 defect):** `git diff sprint/S-41 HEAD` in the outer
worktree also shows `STORY-058-01`/`STORY-058-02`'s pending-sync files as "changed." This is pure
base-branch drift — `sprint/S-41` advanced past the CR-123 worktree's branch point (merge-base
`019e9cb4`) via an unrelated orchestrator commit (`a8f0b29b`, "apply M1 plan to STORY-058-01/-02").
Diffing the worktree against its own merge-base confirms zero touch on those two files. DevOps'
merge order already accounts for this (M1 plan `:20`).

## 3. `cached_gate_result` predicate-error investigation

The real CR-123 file currently caches:
```yaml
cached_gate_result:
  pass: false
  failing_criteria:
    - id: spidr-coverage
      detail: "predicate error: Error: unsupported predicate shape: spidr-coverage"
```

Evaluated in-process with the story-branch source (`gateCheckHandler` imported from cli
`story/CR-123`'s `src/commands/gate.ts`) and `gatesDocPath` = the worktree's canonical
`readiness-gates.md`, against a throwaway tmp COPY of the CR file placed alongside the real file
(so relative-path criteria like `existing-surfaces-verified` resolve against the real worktree
tree; the real file was never opened for writing). Result: **`pass: true`, `failing_criteria: []`**
— all 11 criteria pass, including `spidr-coverage` itself:

```
[pass] spidr-coverage: not-applicable: no **SPIDR coverage.** lead-in (migration grace)
```

CR-123's own body never puts `**SPIDR coverage.**` at column 0 outside a fence — every mention is
either inline prose or indented inside a fenced markdown example — so the predicate correctly
reads it as not-applicable, exactly the self-fire guard the CR's own §4 item 2 and the TPV's
"self-fire" analysis require. This confirms the cached `predicate error` is caused solely by the
live global `dist` binary (pre-CR-123, invoked by the PostToolUse hook when the Developer's own
Task-Breakdown-checkbox edit re-triggered a re-gate) not yet knowing the `spidr-coverage` shape —
not a real criterion failure in CR-123 or in the Developer's implementation. Scratch file removed
after the run; `git status --short` in the worktree confirmed no residue.

## 4. Verdict

Full-coverage check (CR-081): all 11 §4 verification items are covered by passing tests or direct
inspection — items 1-6 and item 7 by the 61/61 unit+e2e run; item 8 is explicitly a DevOps
post-BD1 sweep (not in scope for this QA-Verify pass, per dispatch and per the CR's own framing);
items 9-11 verified directly above. No deferred-acceptance entry is declared on this CR, so the
CR-082 PASS-PENDING-SMOKE branch does not apply.

QA: PASS
ACCEPTANCE_COVERAGE: 10 of 10 (§4 items 1-7, 9-11; item 8 is DevOps post-BD1, out of QA-Verify scope by design)
MISSING: none
REGRESSIONS: none
VERDICT: Ship it. Predicate, templates, gates-doc registration and the per-type QA pointer all
match the CR and M1 plan contract exactly; mirror parity holds; live `.claude/` untouched; the
cached `predicate error` on the real CR-123 file is confirmed to be a stale-dist artifact, not a
real failure — DevOps re-gates the real file after BD1 as planned.

flashcards_flagged: []

---

## Rework 1 (qa_bounces=1) — post-merge DevOps blocker, Bug.md/CR.md Brief-anchor fix

role: qa

## Mode

VERIFY, read-only. Inputs: outer `story/CR-123` in `.worktrees/CR-123` at fix commit `7602348c`
(on top of the already-merged `3d5e8e90`); cli on `main` at `45bde09` (untouched this round, already
carries the `spidr-coverage` predicate). Dev report's "Rework 1" section reviewed in full.

## 1. Commit scope

`git show 7602348c --stat`: touches exactly
`.cleargate/templates/Bug.md`, `.cleargate/templates/CR.md`,
`cleargate-planning/.cleargate/templates/Bug.md`, `cleargate-planning/.cleargate/templates/CR.md`
(1 line changed each) + the dev report (`CR-123-dev.md`, Rework-1 section, 82 insertions). Both
edits are the single-line Brief-anchor rewrite:
`- SPIDR ← §N SPIDR coverage table` → `- SPIDR ← §N Verification Protocol (SPIDR coverage table)`,
matching the file's own pre-existing anchor convention (title + parenthetical). No `## ` line
added — confirmed both by the diff itself (single-line changes only, no heading touched) and by
`command grep -c '^## '` on both files (Bug.md 9, CR.md 10 — same counts as before this commit,
per the original QA-Verify pass). `cmp` confirms both canonical/live twins are still byte-identical
after the fix (`Bug.md IDENTICAL`, `CR.md IDENTICAL`). cli `main` is untouched — still `45bde09`,
only a pre-existing unrelated `cleargate-0.25.0.tgz` (dated Sep 2, predates this sprint) present.

## 2. Rule-16 sweep

`test/scaffold/enforcement-doc-coherence.node.test.ts` alone, override set:
**26 tests, 26 pass, 0 fail** — both previously-failing Cluster 3 Bug.md anchor tests
("every non-whitelisted Brief anchor resolves to a verbatim body heading" and the
§0.5/§2-Impact negative check) are now green.

Full rule-16 sweep (`command grep -rl CLEARGATE_META_ROOT test | command grep -v integration`,
16 files, run through `run_script.sh` with the override — corrected the file-list computation to
run *inside* `cleargate-cli`, since a first attempt computed the list from the wrong cwd and
produced an empty argument list, see Script Incidents below): **273 tests, 271 pass, 2 fail** —
exact match to the Developer's reported count. Both failures are in
`close-sprint-assume-ack-guard.node.test.ts`:
- `cli.ts --assume-ack option help string mentions CLEARGATE_CI_ACK` — `ENOENT` on
  `<worktree>/cleargate-cli/src/cli.ts`
- `sprint.ts "sprint not closed" message mentions CLEARGATE_CI_ACK` — `ENOENT` on
  `<worktree>/cleargate-cli/src/commands/sprint.ts`

Both are the documented worktree-topology gap: that test hardcodes
`path.join(REPO_ROOT, 'cleargate-cli', 'src', ...)`, and no outer worktree ever materializes a
nested `cleargate-cli/` (cli work happens in the cli main checkout only, per Rule 9). Confirmed by
re-running the same file with no override (defaults to the outer MAIN checkout, which does have a
`cleargate-cli/` sibling): **20 tests, 20 pass, 0 fail** — matches flashcard 2026-08-27 exactly.
No other file in the 16-file sweep failed. This matches the Developer's claim precisely.

## 3. story.md decimal-anchor claim

Read `resolves()` in `enforcement-doc-coherence.node.test.ts` directly
(`test/scaffold/enforcement-doc-coherence.node.test.ts:195-207`). For a `§N` anchor it builds
`new RegExp(\`^${num}\\.\\s+\`)` and matches it against each body heading. When `num` is a decimal
capture like `"2.1"` (from the `§(\d+(?:\.\d+)?)` group), the interpolated pattern is
`^2.1\.\s+` — literally: digit, any-char (from the unescaped `.` inside `num`), digit, then a
**second, literal** `.` before whitespace. Verified directly with a throwaway node one-liner: this
pattern matches `"2.1. Acceptance Criteria"` but NOT `"2.1 Acceptance Criteria (Gherkin)"` (the
real heading text in `story.md:143`, which uses a space, not a second dot, after the decimal
number) — confirmed `false`/`true` exactly as claimed. Whole-number anchors are unaffected: `num`
= `"1"` builds `^1\.\s+`, which correctly matches `"1. The Spec (The Contract)"`.

This means every decimal-numbered (`§N.M`) Brief anchor in `story.md` is structurally unresolvable
under `resolves()`, regardless of title wording — confirmed the three pre-existing anchors
(`§1.1`, `§1.4`, `§1.5`) already carried this property before CR-123, by diffing story.md's
POST-WRITE BRIEF block against the pre-CR-123 `sprint/S-41` tip (unchanged apart from the CR-123
`SPIDR ← §2.1` addition, which is a fourth instance of the same pre-existing shape). The Developer's
claim is correct: this is a genuine, pre-existing test weakness (the `resolves()` regex, not the
templates), and it is not exercised by any test today — `enforcement-doc-coherence.node.test.ts`'s
Cluster 3 only iterates `REL.canonicalBug` / `REL.liveBug`; it never reads `story.md`. Not a CR-123
regression; correctly left out of this rework's scope. Flagging as a flashcard below (own finding,
independent confirmation of the Developer's).

## 4. Verdict

QA: PASS
ACCEPTANCE_COVERAGE: 3 of 3 (commit-scope check, rule-16 sweep, decimal-anchor claim)
MISSING: none
REGRESSIONS: none
VERDICT: Ship it. The Bug.md/CR.md Brief-anchor fix is minimal, correctly scoped, mirror-parity
holds, no heading renumbering, and the CR.md proactive fix is a reasonable defect-class
extrapolation rather than scope creep. The rule-16 sweep's 2 remaining failures are confirmed
pre-existing worktree-topology noise, not a regression. The story.md decimal-anchor finding is
real but out of scope — recorded as a flashcard, not a blocker.

## Script Incidents

First attempt at the rule-16 sweep malformed the command: `$(...)` for the file list was
constructed in the outer shell's cwd (`/Users/ssuladze/Documents/Dev/ClearGate`, no `test/`
directory there) instead of inside `cleargate-cli`, so `command grep -rl CLEARGATE_META_ROOT test`
failed with `grep: test: No such file or directory` and the downstream `npm run test:file --`
ran with an empty file list — Node's test runner then fell back to its own default auto-discovery
across the whole cli repo, an unintended near-full-suite run. This produced the exact Rule 14 side
effect (frontmatter-stamp back-sync into the outer MAIN checkout's `.cleargate/delivery/**` +
`cleargate-planning/MANIFEST.json`, 30 single-line diffs) before I identified and killed the rogue
process (`kill -9` on the `tsx --test`/`npm run test:file`/wrapper `bash -c` PIDs). Reverted with
`git -C /Users/ssuladze/Documents/Dev/ClearGate checkout -- .cleargate/delivery
cleargate-planning/MANIFEST.json`; confirmed no intended edits were present there beforehand, and
confirmed clean afterward. No incident JSON was written by `run_script.sh` for that malformed
invocation (it exited 0 from the wrapper's perspective — the failure was a plain `grep` message,
not a non-zero wrapper exit). Re-ran with the file list correctly computed inside `cleargate-cli`;
that corrected run (271/273, matching the Developer) is the one reported above.

flashcards_flagged:
  - "2026-09-25 · #test-harness #danger · Command substitution `$(...)` inside a `bash -c \"...\"` string is evaluated by the OUTER shell's cwd immediately, not deferred to the inner `cd` — compute file lists in a separate step first."
  - "2026-09-25 · #test-harness #readiness-gates · resolves()'s §N.M regex needs a literal second dot after the decimal digit no real heading has — every decimal Brief anchor (story.md §1.1/§1.4/§1.5/§2.1) is structurally unresolvable; confirms Developer's independent finding."
