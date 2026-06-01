---
story_id: STORY-043-04
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: cli,gates,work-item-type
context_source: |
  Decomposed 2026-06-01 from EPIC-043 §2 WS8(d) ("Gates that don't gate"): `hotfix`
  is not a registered WorkItemType, so `cleargate gate check` errors on every hotfix.
  Grounded by reading cleargate-cli/src/lib/work-item-type.ts, the hotfix.md template,
  and the readiness-gates.md cr/bug blocks; the <=2-file-cap predicate gap was verified
  against readiness-predicates.ts (section ops are >=/>/== only, no <=).
status: Completed
approved: true
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:18Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:18Z
  sessions: []
---

# STORY-043-04: Register the `hotfix` Work-Item Type So `gate check` Stops Erroring

## 1. The Spec (The Contract)

### 1.1 User Story

As a ClearGate user filing an emergency hotfix, I want `cleargate gate check HOTFIX-NNN-*.md` to recognize the `hotfix` work-item type and evaluate a real readiness gate, so that the gate stops erroring out on every hotfix and instead returns a meaningful pass/fail against hotfix-specific criteria.

### 1.2 Detailed Requirements

- Add `'hotfix'` to the `WorkItemType` union in `cleargate-cli/src/lib/work-item-type.ts` (currently `'story' | 'epic' | 'proposal' | 'cr' | 'bug' | 'initiative' | 'sprint'`).
- Add a `FM_KEY_MAP` entry mapping the frontmatter key `hotfix_id` → `'hotfix'`. The `hotfix.md` template emits `hotfix_id` in frontmatter, so `detectWorkItemTypeFromFm` must resolve it.
- Add a `PREFIX_MAP` entry mapping the `HOTFIX-` ID/filename prefix → `'hotfix'`, so `detectWorkItemType(idOrPath)` also resolves hotfix files by path.
- Add a `hotfix` key to `WORK_ITEM_TRANSITIONS` with a single transition `'ready-for-merge'` (matches the hotfix template's Ambiguity Gate header "Ready for Merge"). The `Record<WorkItemType, string[]>` type makes this entry mandatory once `hotfix` joins the union — omitting it is a compile error.
- Add a `work_item_type: hotfix` / `transition: ready-for-merge` gate block to `.cleargate/knowledge/readiness-gates.md` whose criteria match the `hotfix.md` template structure: anomaly populated (§1), files-touched declared (§2), verification steps non-empty (§3), `severity` set, and no TBDs.
- Mirror the identical gate block into the canonical scaffold copy `cleargate-planning/.cleargate/knowledge/readiness-gates.md` (canonical/payload/live sync rule — see EPIC-043 architecture_rules).
- Add a unit test in `cleargate-cli/test/lib/work-item-type.node.test.ts` asserting `detectWorkItemTypeFromFm({ hotfix_id: 'HOTFIX-001' })` resolves to `'hotfix'` and `detectWorkItemType('HOTFIX-001-Slug.md')` resolves to `'hotfix'`.

### 1.3 Out of Scope

- Enforcing the hotfix ≤2-file / ≤30-LOC discipline as a machine gate. The section-count predicate vocabulary supports only `>=`, `==`, `>` (see §3.2) — there is no `<=` op for section counts, so a "≤2 files" cap cannot be expressed today. This story does NOT add a new predicate op; the cap stays a DevOps-merge / review-time check (§3.2 records the decision).
- Any change to the predicate evaluator (`readiness-predicates.ts`), the gate-check command, or the hotfix template body. This story only registers the type and adds a gate block that uses the EXISTING predicate vocabulary.
- The other EPIC-043 WS8 gate repairs ((a) sentinel, (b)/(c) CR/Bug context_source + repro, (e) close_sprint dist guard, (f) reporter resync) — those are sibling stories; do not touch their files.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Register the hotfix work-item type

  Scenario: gate check resolves a hotfix file and evaluates its gate
    Given a HOTFIX-NNN-*.md file with hotfix_id in frontmatter and severity set
    When the user runs "cleargate gate check" on that file
    Then detectWorkItemTypeFromFm resolves the type to "hotfix"
    And the gate evaluator loads the work_item_type: hotfix block from readiness-gates.md
    And it returns a pass/fail result instead of erroring on an unknown type

  Scenario: detection resolves hotfix from both frontmatter key and filename prefix
    Given a frontmatter record { hotfix_id: "HOTFIX-001" }
    When detectWorkItemTypeFromFm is called
    Then it returns "hotfix"
    And detectWorkItemType("HOTFIX-001-Slug.md") also returns "hotfix"

  Scenario: Unknown-type Error path is preserved for non-hotfix unrecognized files
    Given a file whose frontmatter carries no recognized ID key and whose name has no known prefix
    When detectWorkItemTypeFromFm and detectWorkItemType run
    Then both return null without throwing an Error
    And the gate check surfaces its standard unknown-type message rather than mis-classifying it as hotfix
```

### 2.2 Verification Steps (Manual)

- [ ] Run `npm --prefix cleargate-cli run typecheck` — clean; the new `hotfix` union member forces a `WORK_ITEM_TRANSITIONS` entry and the build confirms it is present.
- [ ] Run `node --import tsx/esm --test cleargate-cli/test/lib/work-item-type.node.test.ts` — the new hotfix detection assertions pass.
- [ ] Author a throwaway `HOTFIX-999-Smoke.md` from `.cleargate/templates/hotfix.md`, set `severity` + `approved: true`, fill §1/§2/§3; run `node cleargate-cli/dist/cli.js gate check` on it and confirm it returns a pass/fail (no unknown-type error).
- [ ] `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` shows the hotfix block is identical in both (canonical mirror in sync).

## 3. The Implementation Guide

### 3.1 Context & Files

- `cleargate-cli/src/lib/work-item-type.ts` — add `'hotfix'` to the `WorkItemType` union (line 8), a `{ key: 'hotfix_id', type: 'hotfix' }` entry to `FM_KEY_MAP` (lines 14-22), a `{ prefix: 'HOTFIX-', type: 'hotfix' }` entry to `PREFIX_MAP` (lines 27-35), and a `hotfix: ['ready-for-merge']` entry to `WORK_ITEM_TRANSITIONS` (lines 73-81).
- `.cleargate/knowledge/readiness-gates.md` — add a new `work_item_type: hotfix` YAML gate block (alongside the existing cr/bug/sprint blocks at lines 141-196).
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — add the byte-identical hotfix gate block to the canonical scaffold mirror.
- `cleargate-cli/test/lib/work-item-type.node.test.ts` — add the hotfix detection unit test.

### 3.2 Technical Logic

- **Type registration.** `WORK_ITEM_TRANSITIONS` is typed `Record<WorkItemType, string[]>`, so the moment `'hotfix'` enters the union, TypeScript requires the `hotfix` key — `typecheck` is the enforcement that the transition entry was not forgotten.
- **Transition name.** Use `ready-for-merge` (the hotfix lifecycle terminal per the template's Ambiguity Gate "Requirements to pass to Green (Ready for Merge)"), distinct from the story `ready-for-execution` and bug `ready-for-fix` transitions.
- **Gate block criteria (using ONLY the existing predicate vocabulary in `readiness-predicates.ts`).** Mirror the bug block's shape:
  - `anomaly-populated` → `"section(1) has ≥1 listed-item"` (§1 Anomaly has Expected/Actual bullets).
  - `files-touched-declared` → `"section(2) has ≥1 declared-item"` (§2 Files Touched bullet list).
  - `verification-steps-nonempty` → `"section(3) has ≥1 unchecked-checkbox"` (§3 is a `- [ ]` checklist; non-empty is the template's stated merge-block rule).
  - `severity-set` → `"frontmatter(.).severity != null"`.
  - `no-tbds` → `"body does not contain marker 'TBD'"`.
- **The ≤2-file cap — DECLARED DECISION.** The section-count predicate supports only `>=`, `==`, `>` (`readiness-predicates.ts:16,88-91,516-521`); there is no `section <= n` op. Adding one is out of scope for this story. **Decision: enforce the ≤2-file / ≤30-LOC hotfix discipline at DevOps-merge / review time, NOT as a machine gate.** A `<=` predicate op is a separate, larger change (touches the parser, the type union, and the evaluator) and would be its own story if ever wanted.
- **Detection order safety.** `FM_KEY_MAP` is first-match-wins; `hotfix_id` is unique to the hotfix template and collides with no other ID key, so insertion position is immaterial — append it to keep the diff minimal.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test | Type | Asserts |
|---|---|---|
| `detectWorkItemTypeFromFm({ hotfix_id })` → `'hotfix'` | unit | frontmatter-key detection resolves hotfix |
| `detectWorkItemType('HOTFIX-001-Slug.md')` → `'hotfix'` | unit | filename-prefix detection resolves hotfix |
| `detectWorkItemTypeFromFm({})` → `null` | unit | unknown-type path still returns null, no throw |
| `WORK_ITEM_TRANSITIONS.hotfix` defined | unit/typecheck | transition entry present (compile-enforced) |
| `gate check` on a real hotfix file | integration (manual) | returns pass/fail, no unknown-type error |

### 4.2 Definition of Done

- [ ] `'hotfix'` added to the `WorkItemType` union, `FM_KEY_MAP`, `PREFIX_MAP`, and `WORK_ITEM_TRANSITIONS`.
- [ ] `work_item_type: hotfix` gate block added to `.cleargate/knowledge/readiness-gates.md` using only the existing predicate vocabulary.
- [ ] Canonical mirror `cleargate-planning/.cleargate/knowledge/readiness-gates.md` updated byte-identically.
- [ ] Unit test for hotfix detection (frontmatter key + filename prefix) added and green.
- [ ] `npm --prefix cleargate-cli run typecheck` clean and `npm --prefix cleargate-cli test` green.
- [ ] A smoke `gate check` on a hotfix-template file returns a pass/fail, not an unknown-type error.
- [ ] The ≤2-file enforcement decision (DevOps-merge, not machine gate) is recorded in §3.2.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story modifies. Paths grep/read-verified 2026-06-01.

- **Surface:** `cleargate-cli/src/lib/work-item-type.ts:8` — the `WorkItemType` union lacks `hotfix`; `:14-22` `FM_KEY_MAP` and `:27-35` `PREFIX_MAP` have no hotfix entry; `:73-81` `WORK_ITEM_TRANSITIONS` has no hotfix key. This is the single registration point; `detectWorkItemTypeFromFm` (`:41-50`) and `detectWorkItemType` (`:57-67`) read these maps, so registering here fixes the whole detection path.
- **Surface:** `.cleargate/knowledge/readiness-gates.md:141-196` — the cr/bug/sprint/initiative gate blocks; there is no `hotfix` block, which is why `gate check` errors on hotfix files. The bug block (`:160-172`) is the closest structural model to copy.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:16,88-91,516-521` — section-count predicates support only `>=`/`==`/`>`; no `<=`. Confirms the ≤2-file cap cannot be a machine gate today (drives the §3.2 decision).
- **Surface:** `.cleargate/templates/hotfix.md:31-43,76-94,102-111` — the template emits `hotfix_id` + `severity` + `lane: hotfix` frontmatter and §1/§2/§3 body sections plus an "Ready for Merge" Ambiguity Gate; the gate criteria must match this structure.
- **Surface:** `cleargate-cli/test/lib/work-item-type.node.test.ts` — existing node:test suite for this module; the hotfix assertions extend it (no new test harness).
- **Coverage:** ~100% extension of existing detection + gate-block surfaces — no net-new abstraction.

## Why not simpler?

- **Smallest existing surface:** `cleargate-cli/src/lib/work-item-type.ts` (the four maps) plus one new YAML block in the existing `readiness-gates.md` — both already exist; this story only adds entries to them. No new module, command, or predicate op.
- **Why isn't extension/config sufficient?** It is precisely extension — that is the point. The only reason it is a Story (not a no-code config tweak) is that the `WorkItemType` union is a TypeScript type, so adding a value requires a source edit + a compile-enforced `WORK_ITEM_TRANSITIONS` entry + a unit test, and the gate block must be mirrored to the canonical scaffold. The tempting "simpler" path — a `<=` predicate op to also machine-enforce the ≤2-file cap — is explicitly rejected as out of scope (§3.2): it is a larger, separate change to the predicate evaluator and is not needed to stop the unknown-type error this story targets.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] Parent epic (EPIC-043) is `approved: true`.
- [x] §1 The Spec defines a single-sentence user story and bulleted requirements.
- [x] §2 Acceptance Criteria has a Feature and ≥2 Scenarios including a named Error/edge path.
- [x] §3 Context & Files lists only real, grep-verified paths this story changes.
- [x] §4 Definition of Done is a non-empty checklist.
- [x] §Existing Surfaces cites ≥1 source-tree path with file:line.
- [x] §Why not simpler? has both sub-bullets answered.
- [x] 0 "TBDs" exist in the document.
