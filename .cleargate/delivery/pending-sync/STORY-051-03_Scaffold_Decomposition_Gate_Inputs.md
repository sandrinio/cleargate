---
story_id: STORY-051-03
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (sprint init)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T18:17:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-051-03: Give the Decomposition & Sprint-Readiness Gates a Work List
**Complexity:** L2 — Scaffold `epics:`/`proposals:`/`context_source:` into the Sprint Plan Template and make the decomposition gate fail closed on missing inputs instead of passing vacuously.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer running `cleargate sprint init`, I want the decomposition gate to have an actual work list to check and to fail closed when a sprint declares none, so that a template-authored sprint can no longer sail through a gate the docs call "Always enforced" while the gate silently checks nothing.

### 1.2 Detailed Requirements
- The Sprint Plan Template frontmatter declares `epics: []`, `proposals: []`, and `context_source:` (empty defaults), in all three synced copies (live, canonical, payload), so that `reconcileDecomposition` reads the fields it currently finds absent.
- `reconcileDecomposition` surfaces a `declaredNone: true` signal in its result when both `epics` and `proposals` resolve to empty (no work list declared), instead of returning a benign `missing: []`.
- `reconcileDecomposition` surfaces an `error` signal in its result when the sprint plan cannot be read or its frontmatter cannot be parsed, instead of swallowing the failure and returning a benign empty result.
- The `cleargate sprint init` decomposition gate exits non-zero (exit 1) when the reconciler reports `declaredNone` or `error`, UNLESS `--allow-drift` is passed — in which case it emits a waiver note and proceeds (exit 0).
- The existing hard block for a referenced-but-undecomposed epic/proposal (`missing.length > 0`) is preserved and remains NON-waivable by `--allow-drift` (an epic that is referenced but has no child stories is a genuine decomposition failure, not an epic-less sprint).
- The readiness-gates `sprint` bucket keeps its `discovery-checked` / `context_source` criterion (it is NOT dropped for sprints) and the doc states explicitly that for a sprint `context_source` records the sprint's own decomposition evidence (which epics/proposals it decomposes), not an upstream approval doc — distinguishing it from the epic bucket's `frontmatter(context_source).approved == true` upstream form.
- Canonical → live → payload copies of both edited scaffold files (Sprint Plan Template, readiness-gates) are byte-synced after the change.

### 1.3 Out of Scope
- Redesigning the sprint schema or introducing any new frontmatter beyond `epics`/`proposals`/`context_source`.
- Editing the epic or story templates — they already carry `context_source` and are unaffected.
- Adding an `allowDrift` parameter to the `reconcileDecomposition` library signature (the flag stays a consumer concern in `sprint.ts`; the existing API-contract test that asserts the lib takes no such parameter must keep passing).
- Reintroducing `execution_mode` / `v1` / `v2` / `CLEARGATE_EXEC_MODE` as behavior switches — `CLEARGATE_ADVISORY=1` remains the only enforcement-strength lever, and this story adds no new switch.
- Strengthening the readiness-gate `context_source` predicate beyond `!= null` (array-non-empty enforcement is the decomposition gate's job at sprint init, not the readiness gate's).

### 1.4 Open Questions
> Both decisions this story depends on were resolved by the human at epic gate review. No new open question surfaced during drafting.

- **Question (Q7):** Keep the sprint-readiness `context_source` criterion for the sprint bucket, or drop it (a sprint has no upstream approval doc the way an epic/story does)?
- **Recommended:** Keep it, retargeted to the sprint's own decomposition evidence.
- **Human decision:** KEEP the criterion, RETARGETED to the sprint's decomposition evidence (its `epics:`/`proposals:` list) rather than an upstream approval doc. Documented in readiness-gates.md.

- **Question (Q8):** Should the decomposition + lifecycle-init gates fail closed on missing inputs or a reconciler exception, instead of the current silent fail-open?
- **Recommended:** Fail closed — silent fail-open is exactly how these gates became no-ops.
- **Human decision:** FAIL CLOSED — exit non-zero on missing inputs (`declaredNone`) or a reconciler exception (`error`), UNLESS `--allow-drift` is passed.

### 1.5 Risks
- **Risk:** The two existing tests that encode the old vacuous-pass — `decomposition-gate.node.test.ts:128` ("empty epics and proposals → missing=[], clean=0") and `sprint-init-decomp-gate.node.test.ts:211` ("no epics or proposals → gate passes with missing=[], clean=0") — will fail after this change. / **Mitigation:** Update both in the same commit to assert the new fail-closed behavior (`declaredNone: true`; consumer blocks unless `--allow-drift`). They are listed in §3.1 as touched, not net-new.
- **Risk:** Fail-closed could break sprints authored from the template before this epic. / **Mitigation:** Default-empty arrays keep the template structurally valid; `--allow-drift` is the escape for an intentionally epic-less sprint; already-archived sprints are never re-run through `sprint init`, so they are unaffected.
- **Risk (shared-file collision):** Sibling story STORY-051-01 also edits `cleargate-cli/src/commands/sprint.ts` / the pre-commit gate scripts, and the Sprint Plan Template / readiness-gates are broad scaffold files other EPIC-051 stories sweep for dead vocabulary. / **Mitigation:** This story touches only the decomposition-gate block (`sprint.ts:295-323`), the frontmatter tail of the template, and the sprint bucket of readiness-gates — narrow, additive regions. Sequence merges so the file-surface / lifecycle stories land first where they share `sprint.ts`, and re-run `npm run prebuild` after canonical edits to keep the payload mirror consistent.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)
```gherkin
Feature: Decomposition gate has a work list and fails closed on missing inputs

  Scenario: Template-authored sprint carries the decomposition fields
    Given a sprint plan authored from the Sprint Plan Template
    When I read its frontmatter
    Then it declares "epics: []", "proposals: []", and "context_source:"
    And the readiness sprint gate reads the sprint's own "context_source" (self-referential, not an upstream approval doc)

  Scenario: Sprint declaring no epics or proposals fails closed
    Given a sprint plan whose "epics" and "proposals" arrays are both empty
    And no "--allow-drift" flag is passed
    When "cleargate sprint init" runs the decomposition gate
    Then reconcileDecomposition reports declaredNone
    And the gate exits non-zero and names the missing work list

  Scenario: --allow-drift waives an intentionally epic-less sprint
    Given a sprint plan whose "epics" and "proposals" arrays are both empty
    And "--allow-drift" is passed
    When "cleargate sprint init" runs the decomposition gate
    Then the gate emits a waiver note and exits zero

  Scenario: An unreadable or unparseable sprint plan fails closed
    Given a sprint plan that cannot be read or whose frontmatter cannot be parsed
    And no "--allow-drift" flag is passed
    When "cleargate sprint init" runs the decomposition gate
    Then reconcileDecomposition reports an error signal
    And the gate exits non-zero rather than proceeding silently

  Scenario: A referenced-but-undecomposed epic still hard-blocks
    Given a sprint plan that references EPIC-900 which has no child story files
    And "--allow-drift" is passed
    When "cleargate sprint init" runs the decomposition gate
    Then the gate still exits non-zero because --allow-drift does not waive a real decomposition failure
```

### 2.2 Verification Steps (Manual)
- [ ] Open all three Sprint Plan Template copies and confirm `epics: []`, `proposals: []`, `context_source:` are present and identical.
- [ ] Run `npm run prebuild` in `cleargate-cli/`, then `diff` canonical vs payload for both edited files — expect no differences.
- [ ] Author a scratch sprint plan with empty `epics`/`proposals`, run `cleargate sprint init` — confirm exit 1 with a "no work list" message; re-run with `--allow-drift` — confirm exit 0 with a waiver note.
- [ ] Point `sprintPlanPath` at a nonexistent file and run the gate — confirm exit 1 (not a silent proceed) without `--allow-drift`.
- [ ] Read the readiness-gates `sprint` bucket and confirm the `discovery-checked` criterion is still present with the retargeting note.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/lifecycle-reconcile.ts` — add `declaredNone` + `error` to `ReconcileDecompositionResult` (101-104) and populate them in `reconcileDecomposition` (546-565, read failures at 550-562) |
| Related File (consumer) | `cleargate-cli/src/commands/sprint.ts` — decomposition-gate block (295-323): fail closed on `declaredNone`/`error` unless `allowDrift`; the catch at 319-322 stops proceeding silently |
| Related File (template, live) | `.cleargate/templates/Sprint Plan Template.md` — add three frontmatter fields before the closing `---` (frontmatter block lines 40-66) |
| Related File (template, canonical) | `cleargate-planning/.cleargate/templates/Sprint Plan Template.md` — same edit |
| Related File (template, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/Sprint Plan Template.md` — regenerated by `npm run prebuild`; staged with the commit |
| Related File (readiness, canonical) | `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — sprint bucket (174-183): keep `discovery-checked`, add Q7 retargeting note |
| Related File (readiness, live) | `.cleargate/knowledge/readiness-gates.md` — same edit (currently byte-identical to canonical) |
| Related File (readiness, payload) | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md` — regenerated by `npm run prebuild`; staged with the commit |
| Related File (unit test) | `cleargate-cli/test/lib/decomposition-gate.node.test.ts` — add fail-closed cases; update the vacuous-pass test at line 128 |
| Related File (integration test) | `cleargate-cli/test/commands/sprint-init-decomp-gate.node.test.ts` — add consumer `--allow-drift` cases; update the "no epics → passes" test at line 211 |
| New Files Needed | None — every edit extends an existing file |

### 3.2 Technical Logic

**Template frontmatter (three copies).** In each Sprint Plan Template copy, add to the frontmatter block (before the closing `---` at line 66):
```yaml
epics: []          # canonical epic IDs this sprint decomposes; decomposition gate reads this (fail-closed if empty — see readiness-gates.md)
proposals: []      # proposal IDs carried; each must resolve to a decomposed epic
context_source: "" # sprint's own decomposition evidence (which epics/proposals it decomposes), NOT an upstream approval doc
```
Defaults are empty so the template stays structurally valid; a newly-authored sprint must fill them or pass `--allow-drift`.

**`lifecycle-reconcile.ts` — surface the fail-closed signals.** Extend `ReconcileDecompositionResult` (101-104):
```ts
export interface ReconcileDecompositionResult {
  missing: MissingDecomp[];
  clean: number;
  declaredNone: boolean;      // true when both epics[] and proposals[] are empty
  error?: string;             // set when the sprint plan is unreadable/unparseable
}
```
In `reconcileDecomposition`, change the two internal catch returns (the `fs.readFileSync` catch at ~553 and the `parseFrontmatter` catch at ~561) from `{ missing: [], clean: 0 }` to include `error: 'sprint-plan-unreadable'` / `error: 'frontmatter-parse-failed'` (with `declaredNone: false`). After computing `epics` and `proposals` (564-565), set `const declaredNone = epics.length === 0 && proposals.length === 0;` and include it in the final `return { missing, clean, declaredNone };` (currently `return { missing, clean };` at line 644). The library still does NOT take an `allowDrift` parameter — it only reports state; the exit decision stays in the consumer.

**`sprint.ts` — consume the signals, honor `--allow-drift`.** In the decomposition-gate block (295-323), after `const decompResult = reconcileDecomposition({ sprintPlanPath, deliveryRoot })`:
- If `decompResult.error` and not `allowDrift`: print `[cleargate sprint init] decomposition gate: sprint plan could not be read/parsed (<error>) — failing closed. To waive: pass --allow-drift.` and `return exitFn(1)`.
- Else if `decompResult.declaredNone` and not `allowDrift`: print `[cleargate sprint init] decomposition gate: sprint declares no epics or proposals — no work list to verify. Declare epics:/proposals: in the sprint plan, or pass --allow-drift for an intentionally epic-less sprint.` and `return exitFn(1)`.
- Else if `decompResult.error || decompResult.declaredNone` and `allowDrift`: print a waiver note and proceed.
- The existing `missing.length > 0` branch (304-318) is unchanged — hard block, `--allow-drift` still does NOT waive it.
- Replace the outer `catch` at 319-322 so an unexpected throw fails closed (`return exitFn(1)` unless `allowDrift`) rather than "proceeding without check". New exit codes: **0** on a clean/decomposed or waived gate; **1** on missing decomposition, `declaredNone`, or reconciler error without `--allow-drift`.

**`readiness-gates.md` (three copies) — Q7 retarget.** Keep the `sprint` bucket `discovery-checked` criterion (`frontmatter(.).context_source != null`, line 181-182) unchanged; it already reads the sprint's own frontmatter (`.` ref), unlike the epic bucket's upstream `frontmatter(context_source).approved == true` (line 73). Add a short prose note beneath the sprint YAML block stating that a sprint's `context_source` documents its decomposition evidence (its `epics:`/`proposals:` list), not an upstream approval, so the self-referential form is intentional.

### 3.3 API Contract (if applicable)

| Command | Condition | Exit |
|---|---|---|
| `cleargate sprint init <id>` | sprint's referenced epics/proposals are all decomposed | 0 |
| `cleargate sprint init <id>` | `epics`/`proposals` both empty, no `--allow-drift` | 1 (fail closed: declaredNone) |
| `cleargate sprint init <id> --allow-drift` | `epics`/`proposals` both empty | 0 (waived, waiver note emitted) |
| `cleargate sprint init <id>` | sprint plan unreadable/unparseable, no `--allow-drift` | 1 (fail closed: error) |
| `cleargate sprint init <id> [--allow-drift]` | references an epic with no child stories | 1 (hard block; `--allow-drift` does not waive) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit — `reconcileDecomposition` (`decomposition-gate.node.test.ts`) | 4 | `declaredNone: true` when both arrays empty; `declaredNone: false` when an epic or proposal is present; `error` set on unreadable/unparseable plan; `missing[]` still produced for a referenced-but-undecomposed epic (regression). node:test/tsx only. |
| Integration — sprint-init consumer (`sprint-init-decomp-gate.node.test.ts`) | 4 | empty epics/proposals + no `--allow-drift` → exit 1; + `--allow-drift` → exit 0; reconciler `error` + no `--allow-drift` → exit 1; referenced-undecomposed → exit 1 regardless of `--allow-drift`. |
| Updated existing tests | 2 | Flip `decomposition-gate.node.test.ts:128` and `sprint-init-decomp-gate.node.test.ts:211` from vacuous-pass to fail-closed assertions. |

### 4.2 Definition of Done (The Gate)
- [ ] `epics: []`, `proposals: []`, `context_source:` present in all three Sprint Plan Template copies (byte-identical after `npm run prebuild`).
- [ ] `reconcileDecomposition` returns `declaredNone` and `error`; `sprint.ts` fails closed on both unless `--allow-drift`; the `missing[]` hard block preserved.
- [ ] readiness-gates sprint bucket keeps `discovery-checked` with the Q7 retargeting note, synced across all three copies.
- [ ] All five §2.1 Gherkin scenarios are covered by node:test cases (`*.node.test.ts`, tsx `--test`); the two legacy vacuous-pass tests updated; suite green.
- [ ] Canonical → live → payload synced (`npm run prebuild` run; `diff` clean for both edited scaffold files).
- [ ] `npm run typecheck` clean for `cleargate-cli`.
- [ ] Grep gate clean: no `execution_mode` / `v1` / `v2` / `CLEARGATE_EXEC_MODE` behavior switch introduced by this story.

## Existing Surfaces
> L1 reuse audit.

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:546` — `reconcileDecomposition` already parses the sprint plan and reads `epics`/`proposals` (564-565); the gate exists, it just receives no input and swallows read/parse errors (550-562).
- **Coverage of this requirement:** partial — the read logic and `missing[]` production exist; the `declaredNone`/`error` fail-closed signals and the template fields do not. This story extends the function, it does not create it.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:295` — the decomposition-gate consumer block that already exits 1 on `missing[]` (317) and already threads `allowDrift` (200).
- **Coverage of this requirement:** partial — the gate wiring and `--allow-drift` plumbing exist; the fail-closed branches for `declaredNone`/`error` do not.
- **Surface:** `cleargate-cli/test/lib/decomposition-gate.node.test.ts:1` and `cleargate-cli/test/commands/sprint-init-decomp-gate.node.test.ts:1` — existing node:test suites for the gate (CR-017 scenarios) to extend rather than replace.
- **Coverage of this requirement:** partial — covers the `missing[]` cases; the vacuous-pass tests (128, 211) encode the old behavior and must be updated.
- **Surface:** `cleargate-planning/.cleargate/knowledge/readiness-gates.md:174` — the `sprint` readiness bucket carrying the `discovery-checked` criterion (`frontmatter(.).context_source != null` at 181-182).
- **Coverage of this requirement:** partial — the criterion exists and already self-references (`.` ref); only the retargeting note is missing.

## Why not simpler?
- **Smallest existing surface that could carry this:** `reconcileDecomposition` in `cleargate-cli/src/lib/lifecycle-reconcile.ts:546` plus its consumer block in `sprint.ts:295` — both exist; this story extends them and adds the template fields they read. Not net-new.
- **Why isn't extension / parameterization / config sufficient?** It is extension — that is the design. But the gate cannot become non-vacuous by config alone: the sprint plans it reads carry no `epics`/`proposals` fields today, so the template must gain them (in three synced copies), and the reconciler must gain a positive `declaredNone`/`error` signal because an empty `missing[]` is genuinely ambiguous between "clean" and "nothing to check." A single env-var switch would not distinguish those cases, and reusing the existing `missing[]` hard-block path is wrong because Q8 requires `declaredNone` to be `--allow-drift`-waivable while the referenced-but-undecomposed case must stay non-waivable — two distinct policies that need two distinct signals.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

> Boxes 1-5 are satisfied: policy decisions Q7/Q8 are resolved and committed, every §3.1 path was Read/Grepped and confirmed to exist, and the technical logic cites current line numbers. The remaining gap to 🟢 is the epic-level `approved: true`, which is not this story's to set.