---
story_id: STORY-054-02
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS2. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-08-25T12:00:00Z
updated_at: 2026-08-25T19:12:57Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
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
  last_gate_check: 2026-08-25T19:12:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-054-02: Spike as a first-class type — registry, gates, KNOWN_TYPES
**Complexity:** L3 — one closed union plus three lookup tables, two knowledge docs and their mirrors

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want `spike` registered as a work-item type, so that a spike charter can be gate-checked and pushed instead of being an unrecognised document.

### 1.2 Detailed Requirements
- Requirement 1: Extend the closed `WorkItemType` union in `cleargate-cli/src/lib/work-item-type.ts:8` with `'spike'`.
- Requirement 2: Register `spike_id` in the frontmatter-key table (:15) and `SPIKE-` in the prefix table (:29), preserving longest-first ordering.
- Requirement 3: Add `spike: ['ready-to-investigate', 'ready-to-conclude']` to `WORK_ITEM_TRANSITIONS` (:75). The map is typed `Record<WorkItemType, string[]>`, so omitting it fails typecheck — that is the intended forcing function.
- Requirement 4 (**AMENDED 2026-08-27, orchestrator — predicate kind corrected**): Add two
  `work_item_type: spike` gate blocks to `.cleargate/knowledge/readiness-gates.md`, `severity: advisory`,
  modelled on the `initiative` block at :220. Criteria assert presence only — question stated, timebox set,
  kill criteria set, no TBD marker. No Gherkin criterion, no files-to-touch criterion.

  **Use `listed-item` for §1, §2 and §5 — NOT `declared-item`.** This requirement originally said
  `declared-item`; that is superseded. `declared-item` counts any line that starts with a capital letter and
  carries a colon before any `|` or `*` — which includes ordinary guidance prose, not merely bold labels
  (measured, see below). The shipped `spike.md` would therefore score §1=1, §2=2, §5=1 on `declared-item`
  and **every such criterion would pass on a charter nobody has filled in** — the [[BUG-050]] fail-open,
  reproduced in a brand-new gate. `readiness-predicates.ts` is frozen sprint-wide, so the fix is predicate
  choice, not predicate repair.

  `listed-item` counts only `/^\s*- /gm`, and STORY-054-01 invariant 1 ships **zero** bullets in those
  sections. Verified by executing the real `evaluate()` against the shipped template:

  | Criterion | Score on unedited template | Verdict |
  |---|---|---|
  | `section(1) has >=1 listed-item` | 0 | fails — correct |
  | `section(2) has >=2 listed-item` | 0 | fails — correct |
  | `section(4) has >=1 declared-item` | 0 | fails — correct |
  | `section(5) has >=1 listed-item` | 0 | fails — correct |

  §4 keeps `declared-item` deliberately: it ships as a header + `|---|` separator + zero data rows, and
  `listed-item` does not count table rows, while a `|`-leading line cannot match the definition-list regex.
  Scored 0 as shipped — non-vacuous. The exact YAML for both blocks is in
  `.cleargate/sprint-runs/SPRINT-39/plans/M1.md` §"Schema changes (verbatim)"; copy it from there.
- Requirement 5: Add a `spike` row to the KNOWN_TYPES table in `.cleargate/knowledge/cleargate-protocol.md:684`, taking it from 8 entries to 9, so a spike push does not raise an L2 `TYPE_UNKNOWN`.
- Requirement 6: `TYPE_PREFIXES` in `cleargate-cli/src/lib/work-item-id.ts:49` already contains `SPIKE` and must not be edited.
- Requirement 7: Mirrors updated for both knowledge docs.

### 1.3 Out of Scope
The template itself (STORY-054-01), the wiki bucket (STORY-054-04), and any change to `evalSection` or existing gate indices (BUG-042 and STORY-054-05 own those).

### 1.4 Open Questions

- **Question:** Which transition names should the spike lifecycle use?
- **Recommended:** `ready-to-investigate` (charter approved, work may begin) and `ready-to-conclude` (decision log populated, outcome nameable).
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** This story appends blocks to `readiness-gates.md`, which BUG-042 and STORY-054-05 also touch.
- **Mitigation:** Sprint merge order is `BUG-042 → 054-05 → 054-02 → 054-06`. Appending new blocks does not shift existing `section(N)` indices, so this story cannot disturb the corrections.
- **Risk:** Granularity Rubric — one goal (register a type), files span one module plus two knowledge docs, four Gherkin scenarios, L3 with medium exposure. No split signal trips.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Spike type registration

  Scenario: A spike charter resolves to the spike type
    Given a file whose frontmatter carries spike_id SPIKE-001
    When detectWorkItemTypeFromFm reads it
    Then it returns spike

  Scenario: A spike id resolves by prefix
    Given the identifier SPIKE-001
    When detectWorkItemType parses it
    Then it returns spike

  Scenario: The advisory gate passes without an answer
    Given a charter with a question, a timebox and kill criteria, and an empty Outcome
    When cleargate gate check evaluates it for ready-to-investigate
    Then the gate passes

  Scenario: Error - a charter missing its kill criteria
    Given a charter whose Timebox and Kill Criteria section is empty
    When cleargate gate check evaluates it
    Then the gate reports the failing criterion by id
```

### 2.2 Verification Steps (Manual)
- [ ] `npm --prefix cleargate-cli run typecheck` is clean — proves `WORK_ITEM_TRANSITIONS` gained its required key.
- [ ] KNOWN_TYPES table has 9 rows.
- [ ] `git diff cleargate-cli/src/lib/work-item-id.ts` is empty.

## 3. The Implementation Guide

### 3.1 Context & Files

> **AMENDED 2026-08-27 (orchestrator).** The original surface was flagged INCOMPLETE by two independent
> Architect passes. Three sites were missing outright — one of them makes an *existing, unrelated* test go
> red — plus two orchestrator decisions and one post-flight obligation. Every addition below is either
> required by this story's own contract or is a direct consequence of STORY-054-01 having merged. **This is
> the authoritative surface.**

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/work-item-type.ts` |
| Related Files | `.cleargate/knowledge/readiness-gates.md`, `.cleargate/knowledge/cleargate-protocol.md`, `cleargate-cli/src/commands/push.ts`, `cleargate-cli/test/lib/work-item-type.node.test.ts`, `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`, `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts`, `cleargate-cli/test/commands/gate-unit.node.test.ts`, `cleargate-cli/test/lib/readiness-predicates.node.test.ts`, `.cleargate/templates/spike.md` |
| Mirrors | `cleargate-planning/.cleargate/knowledge/readiness-gates.md`, `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.cleargate/templates/spike.md` |
| Reference (read-only, do not edit) | `cleargate-cli/src/lib/work-item-id.ts` |
| New Files Needed | Yes — one `*.node.test.ts` under `cleargate-cli/test/` |

**What was added, and why each is not optional:**

| # | Site | Why |
|---|---|---|
| 1 | `test/lib/work-item-type.node.test.ts:182-186` | Hardcodes `WORK_ITEM_TRANSITIONS` at **8** entries; `spike` makes 9. This test goes **red** and nothing in the original story mentions it — easily misread as "I registered the type wrong". Bump to 9, and update the test title and the header comment at `:18`. |
| 2 | `src/commands/push.ts:506-518` | `getItemType`'s private map lacks `spike_id`, so `push.ts:253-257` turns the `null` into `Error: cannot determine item type` + `exit(1)`. §1.1 promises "gate-checked **and pushed**". **Orchestrator decision — TAKEN** (M1 Open Decision #2). Add a fifth Gherkin scenario. |
| 3 | `test/docs/gate-section-index-pinning.node.test.ts` | The **T2 four-site edit set**: `TEMPLATE_FOR` (~:111-118) gains `spike: 'spike.md'`; S1a totals `:432` **14→18** and `:434` **12→16**; S6 total `:644` **12→16**. Four new `section(N)` criteria arrive with the two spike gate blocks. Also **six** stale prose sites name the old counts — header `:22`, `:23`, `:41` plus titles `:430`, `:443`, `:633` (TPV measured; the story's original "three" undercounted). **Do NOT touch `:7`** — its `14` is the test-*case* count, a homonym. |
| 4 | `test/fixtures/gate-section-index/expected-headings.ts` | Four new fixture rows pinning the spike criteria to their headings. **Hand-write them from the criterion ids — never by running the resolver.** A fixture derived from a resolver run passes green while asserting nothing; that is the entire defect STORY-054-05 exists to prevent. |
| 5 | `.cleargate/templates/spike.md` + mirror | **Guidance fix, orchestrator decision.** A *correct* charter written in the prose shape the template teaches scores **0** on `question-stated`, `timebox-and-kill-criteria-set` and `outcome-declared` — the template teaches prose, the gate counts `- ` bullets. Every authored spike would ship three failing criteria, which is how a team learns to ignore a gate. Adjust §1/§2/§5 guidance to instruct **bullet-form answers**. **Invariant 1 still holds**: an instruction *sentence* contains no line-initial `- `, so the shipped template keeps scoring 0. Never add a worked-example bullet. |
| 6 | `cleargate-protocol.md:650` | §21.2's prose names the default bucket set and goes stale once `spikes` exists. **Orchestrator decision (M1 Open Decision #3)** — one token, in a file this story already opens in both trees. |
| 7 | `test/commands/gate-unit.node.test.ts:748` + `test/lib/readiness-predicates.node.test.ts:714` | **TPV addition (wave-4 TPV, Ruling 1).** Both hardcode the readiness-gates.md fenced-block count at **9**; the two spike blocks make **11**. Neither was named anywhere in the story, the M1 plan, or the T2 four-site set — they are a *fifth* and *sixth* T2 site discovered by dry-run. Bump both assertions to 11 and update their titles (`:738`, `:699`) and comments (`:747`, `:713`). Must land in the **same** cli commit: with them bumped the dry-run failure set is byte-identical to pristine; without them the Developer's own suite run goes red on two files the story never declared. |

**Also required in the new test file — "Pin A" (Architect post-flight, STORY-054-01).** Assert that the
**shipped** `spike.md` **fails** each of the four new criteria. ~12 lines, no fixture, no allowlist, no edit
to a merged file. This is not belt-and-braces: [[BUG-054]] measures that **9 of 12** existing `section(N)`
criteria already pass against their own blank template, and two of those nine fail open through
`listed-item` — the predicate this story relies on. The non-vacuity of the spike gate currently rests on an
authoring convention with **nothing enforcing it**, and mutation testing confirmed that bulleting §1 or §2,
or deleting any heading above position 5, silently turns a criterion green on an empty charter. Cross-Cutting
Rule 4 does not catch it — it covers heading *insertion* only.

**Execution routing (non-negotiable, from post-flight):** `TEMPLATE_FOR.spike` is **inert inside a worktree**
— `META_ROOT = resolve(CLI_ROOT, '..')` (pinning test `:96`) never resolves into one, so S1c `continue`s on
the missing path and yields silent zero coverage. **STORY-054-02 executes in the MAIN outer checkout** on
`story/STORY-054-02`, plus a branch in the `cleargate-cli` checkout. Wave 4 runs alone, so the main checkout
is free.

**Ordering hazard (R19):** this story has **no inert intermediate** — verified both directions
(registry-first → S1a/S1b/S5/S6 red; test-first → S1a/S5 red). Both commits go in **one** Developer turn with
the suite run **once, after the second**. The trap: a Developer who runs the suite between commits sees four
`no template found for work_item_type "spike"` findings and "resolves" them by adding those ids to
`KNOWN_UNPINNABLE` — which the `:268` message itself suggests. That trips `:634`'s `size === 2` and fails
loudly, but it costs a bounce.

### 3.2 Technical Logic
`WorkItemType` is a closed union and `WORK_ITEM_TRANSITIONS` is a `Record<WorkItemType, string[]>`, so adding the union member makes the compiler demand the transition entry — no separate registration step can be forgotten. Copy the `initiative` gate block at `readiness-gates.md:220` and change the type, transitions, and criteria ids; keep `severity: advisory` so a spike never hard-blocks. Criteria use the existing `section(N) has >=1 declared-item` and `body does not contain marker` predicates — no new predicate kind.

### 3.3 API Contract (if applicable)
Not applicable — internal module surface only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | detectWorkItemTypeFromFm, detectWorkItemType, transitions map, KNOWN_TYPES row count |
| Acceptance tests | 4 | One per Gherkin scenario in §2.1 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `work-item-id.ts` is unmodified.
- [ ] Both knowledge-doc mirrors updated.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/work-item-type.ts:8` — the closed `WorkItemType` union, plus the frontmatter-key table (:15), prefix table (:29) and `WORK_ITEM_TRANSITIONS` (:75). Single registration point.
- **Surface:** `cleargate-cli/src/lib/work-item-id.ts:41` — `TYPE_PREFIXES`, which already contains `SPIKE` at :49. Read-only here.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — the `initiative` advisory gate block is the shape this story copies.
- **Surface:** `.cleargate/knowledge/cleargate-protocol.md` — the KNOWN_TYPES advisory registry.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — the closed-set predicate evaluator the new criteria reuse unchanged.
- **Coverage of this story's scope:** high — roughly 85% extension. Every mechanism exists; this story only registers a new value into surfaces built to be registered into.

## Prior work

- [[EPIC-054]] — parent epic, WS2.
- [[BUG-041]] — established `TYPE_PREFIXES` as the one id grammar and placed `SPIKE` in it; this story closes the divergence between that grammar and the type registry.
- [[STORY-054-01]] — supplies the template this type validates.
- No prior item registers a spike type.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `cleargate-cli/src/lib/work-item-type.ts` — it already carries every table this story writes to; nothing net-new is required structurally.
- **Why isn't extension / parameterization / config sufficient?** Extension *is* what this story does — no new abstraction is introduced. The reason it cannot be pure config is that `WorkItemType` is a closed TypeScript union consumed by a `Record<WorkItemType, string[]>`; a config-driven type would erase the compile-time guarantee that every type has a declared transition, which is precisely the check that stops a half-registered type shipping.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (all confirmed on disk 2026-08-25).
- [x] Why not simpler? has both sub-bullets answered.
