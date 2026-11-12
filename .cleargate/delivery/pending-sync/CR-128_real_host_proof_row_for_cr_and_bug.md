---
cr_id: CR-128
parent_ref: CR-126
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
context_source: "Filed 2026-11-12 as the follow-up to CR-126 §0.5 Q2 (owner agreed: epics first in CR-126, CRs and bugs in a follow-up). Grounded against cleargate-cli main (CR.md, Bug.md, readiness-predicates.ts, readiness-gates.md) on 2026-11-12. Filed for triage, not approved; depends on CR-126 landing first."
area: templates,readiness-gates
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:28:58Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-128
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:28:58Z
  sessions: []
---

# CR-128: CRs and Bugs Declare What Proves It Works in the Real Host

## 0.5 Open Questions

- **Question (Q1):** Should `test-layers-declared` require the new row? Today it passes when no declaration exists, and requires exactly Unit / Integration / E2E when one does. Making the new row required would turn every existing CR and bug red on its next edit: 120 CRs and 106 bugs as of 2026-11-12.
- **Recommended:** Require it only for items created on or after this CR's merge date, read from `created_at`. Older items keep the three-row rule. A constant in `readiness-predicates.ts` names the cut-over date. The row may be `0` with a reason, like the others, e.g. "0 — no runtime change".
- **Human decision:** {populated during triage}

- **Question (Q2):** Should the row be a count, like the other three, or a sentence?
- **Recommended:** A count with a mandatory Notes cell that names the host, the artifact and the observation. For example: `| Real-host proof | 1 | clean-room install of the packed tarball; headless claude -p shows the hook line |`. A count fits the existing table and parser; the Notes cell carries the "what proves it" answer.
- **Human decision:** {populated during triage}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- A CR or bug is fully specified once it declares Unit, Integration and E2E counts (CR template §4, Bug template §5, checked by `test-layers-declared` from [[CR-111]]). Those three counts say nothing about whether the change works in the installed host. EPIC-063 found a hook whose unit tests passed while the model never saw its output.

**New Logic (The New Truth):**
- The `Test layers` table in the CR template (§4) and the Bug template (§5) gains a fourth row, `Real-host proof`. It states what demonstrates the change in the real installed host — a clean-room install, a headless session, a deployed server — or gives `0` with a reason. It matches the "Real-host end-to-end" level that [[CR-126]] adds to the epic `## Testing Strategy`.
- `test-layers-declared` requires the row on items created on or after the cut-over date (§0.5 Q1). Older items are unchanged.
- Stories are out of scope. Story §4.1 already traces to the epic's Testing Strategy levels under CR-126.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Epic: none. Parent is [[CR-126]], which must merge first; this CR reuses its "Real-host end-to-end" vocabulary.
- [x] Invalidate/Update Story: none. Existing CRs and bugs are grandfathered by `created_at` (§0.5 Q1), so nothing reverts.
- [x] Database schema impacts? No.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/CR.md:123` (`## 4. Verification Protocol`) and `:154-160` (the `Test layers` table).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/Bug.md:111` (`## 5. Verification Protocol`) and `:142-148` (the `Test layers` table).
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1277` `evalTestLayersDeclared`, with its fixed `LAYERS` list at `:1291` and the opt-in trigger at `:1279`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md:241-242` (CR gate) and `:266-267` (bug gate), which register `test-layers-declared`; vocabulary entry 11 documents it.
- **Why this CR extends rather than rebuilds:** the table, the parser and the gate registration already exist. This adds one row and one date-gated layer to the existing evaluator; it is not a new predicate.

## Prior work

- [[CR-111]] — Declare test layers at planning (archived). Built `test-layers-declared`; this CR extends its layer list.
- [[CR-126]] — Every epic must answer "how do we test this?" (approved). Parent; defines the real-host level for epics.
- [[BUG-054]] — Gate criteria pass on unedited templates (Draft). The new row must fail on its own unedited template once the cut-over applies.
- [[EPIC-063]] — the incident (hook output invisible to the model despite green unit tests) that motivated the real-host level.
- `.cleargate/FLASHCARD.md` grep for `real.host`: none found.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/templates/CR.md`
- `cleargate-cli/scaffold/core/.cleargate/templates/Bug.md`
- `cleargate-cli/src/lib/readiness-predicates.ts`
- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`
- `cleargate-cli/test/lib/test-layers-real-host.node.test.ts` (new)

## Task Breakdown

- [ ] Red tests: a new-dated CR without the row fails; with the row and a reason passes; an old-dated CR with three rows still passes; the unedited new template fails.
- [ ] Add the row to both templates, with Notes guidance naming host, artifact and observation.
- [ ] Date-gated fourth layer in `evalTestLayersDeclared`; document it in `readiness-gates.md` entry 11.
- [ ] Before/after `gate check` sweep over all CRs and bugs: no result changes for existing items.
- [ ] Clean-room run: `cleargate new cr` / `new bug` show the row, and `gate check` enforces it.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`, then `npm --prefix cleargate-cli run typecheck`, then the clean-room run in `.cleargate/knowledge/clean-room-verification.md`.

**How we test this:**
- **What "working" means:** a CR or bug written after this ships cannot pass its gate without saying what proves it works in the real host, and nothing written before it changes state.
- **Unit:** the four predicate cases in the Task Breakdown.
- **Contract:** `gate check` on fixture items writes the expected `failing_criteria`.
- **Regression:** the before/after sweep over all existing CRs and bugs, with zero changed results allowed.
- **Real host:** a clean-room install from the packed tarball, where `cleargate new cr` and `cleargate new bug` show the row and `gate check` enforces it.
- **Regression guard:** the "unedited new template fails" test stays in `npm test` (BUG-054's rule).

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Row present with a count, row present with `0 — reason`. |
| Interfaces | F | One surface, `cleargate gate check`; the hook runs the same command. |
| Data | T | Two item types (CR, bug) through one Outline. |
| Rules | T | Date cut-over rule; reason-required-for-0 rule. |

```gherkin
Feature: CRs and bugs declare real-host proof

  @data @paths
  Scenario Outline: A new item with the row passes
    Given a <type> created after the cut-over whose Test layers table has a Real-host proof row "<row>"
    When `cleargate gate check` runs
    Then test-layers-declared passes

    Examples:
      | type | row                                                           |
      | CR   | 1 — clean-room install; headless session shows the change      |
      | bug  | 0 — no runtime change, template text only                      |

  @rules
  Scenario: Items created before the cut-over are unchanged
    Given a CR created before the cut-over with only the three original rows
    When `cleargate gate check` runs
    Then test-layers-declared passes as it did before

  @rules
  Scenario: Error — a new item without the row fails
    Given a bug created after the cut-over whose Test layers table has no Real-host proof row
    When `cleargate gate check` runs
    Then failing_criteria contains test-layers-declared naming the missing layer
```

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | New-dated without the row, with the row, `0` with a reason, old-dated three-row. |
| Integration tests | 1 | Before/after `gate check` sweep across every existing CR and bug. |
| E2E / acceptance tests | 1 | Clean-room install shows and enforces the row. |

---

## Context Source

**context_source:** CR-126 §0.5 Q2 follow-up, filed 2026-11-12. Grounded in `CR.md`, `Bug.md`, `readiness-predicates.ts` and `readiness-gates.md` on 2026-11-12.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
