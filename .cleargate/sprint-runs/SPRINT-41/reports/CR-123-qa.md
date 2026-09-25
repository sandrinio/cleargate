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
