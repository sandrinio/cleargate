<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-125_wiki-ignores-sprint-plan-membership.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-125
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: wiki,relations,index
status: Completed
severity: P2-Medium
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test 2026-11-13 addendum (after wiki build: a Draft sprint plan's members show no sprint), reproduced on a pristine copy of the field repo with the published 0.30.0 binary; code grounding at cli main b9fe36a: src/wiki/relations.ts:40 PARENT_KEYS (parent_ref, parent_epic_ref, parent) is the only membership source, src/wiki/page-schema.ts:277-283 identityLine and :311-329 index rows read sprint_cleargate_id only; the sprint plan's epics/stories/crs/bugs frontmatter lists, which cleargate sprint add|remove writes, are never read"
created_at: 2026-11-13T00:00:00Z
updated_at: 2026-11-13T00:00:00Z
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
  last_gate_check: 2026-11-12T21:56:56Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "9e0c33e95f083f371d30acf7066d48c1e3797f6a086bb45340118fc927d77c53"
---

# BUG-125: The wiki ignores a sprint plan's member lists, so planned work shows "no sprint" and sprint pages have no children

### Open Questions

- **Question:** Where does the wiki take sprint membership from?
- **Recommended:** The sprint plan's frontmatter lists (`epics`, `stories`, `crs`, `bugs`, `proposals`), the single write path `cleargate sprint add|remove` maintains. The item's own `sprint_cleargate_id` still wins when it is set. Without it, a listed item shows `SPRINT-02 (planned)` while that sprint is Draft or Ready, and `SPRINT-02` once it is Active. The Deliverables table is not parsed.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** What should a sprint's own page and index row show where an item shows its sprint?
- **Recommended:** Its dates or "not scheduled" (`**Dates:** not scheduled`, `· not scheduled ·` in the index), instead of `Sprint: none` / `no sprint` about itself.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A Draft sprint plan that lists `EPIC-002` and `STORY-002-01`..11 makes the wiki show them as its members: the sprint page lists them as children, `EPIC-002`'s page and index row name the sprint, and the brief's Planned line counts the same members.

**Actual Behavior:**
- `SPRINT-02`'s frontmatter has `epics: [EPIC-002]` and `stories: [STORY-002-01, … STORY-002-11]`, and its Deliverables table lists all 11. Its wiki page has `children: []`, `cites: []` and `Relations: Parent: none`.
- `relations.ts` derives children only from `parent_ref` / `parent_epic_ref` / `parent` (`PARENT_KEYS`, :40), and the identity line and index rows read only `sprint_cleargate_id` (`page-schema.ts:277-283`, :311-329). Planned items have that set to `null` until the sprint starts.
- So `EPIC-002` shows `**Sprint:** none` and the index reads `⟦EPIC-002⟧ — Draft · no sprint`, while the brief's Planned line (`SPRINT-02 — 0/11 🟢`) counts the same 11 members. Two views of one plan disagree.
- Sprint pages say `**Sprint:** none` about themselves. A sprint that set `sprint_cleargate_id` to its own ID prints `**Sprint:** SPRINT-43` about itself, as this meta-repo's SPRINT-43 page does.

## 2. Reproduction Protocol
1. A corpus with `EPIC-002` (`sprint_cleargate_id: null`), stories `STORY-002-01..03` (`parent_ref: EPIC-002`), and a Draft `SPRINT-02` whose frontmatter lists `epics: [EPIC-002]` and `stories: [STORY-002-01, STORY-002-02, STORY-002-03]`.
2. `cleargate wiki build`.
3. Read `wiki/sprints/SPRINT-02.md`, `wiki/epics/EPIC-002.md` and the two rows in `wiki/index.md`.

Edge conditions:
- An item whose own `sprint_cleargate_id` names a different sprint keeps it.
- An item listed by two open sprint plans shows both, so the conflict is visible.
- Stories are excluded from the wiki by default; they still appear as child IDs, as epic pages already list them.

## 3. Evidence & Context
*(Field-repo output: its `[[ID]]` wikilinks are shown as `⟦ID⟧` so this repo's wiki does not link them to its own unrelated items with the same IDs.)*
Reproduced on a pristine copy of the field repo after `upgrade --yes`, `init` and `wiki build`:
```
# wiki/sprints/SPRINT-02.md
children: []
cites: []
**Status:** Draft · **Sprint:** none · **Gate:** pass
# wiki/epics/EPIC-002.md
**Status:** Draft · **Sprint:** none · **Gate:** pass
# wiki/index.md
- ⟦SPRINT-02⟧ — Draft · no sprint — Ingest you can trust — …
- ⟦EPIC-002⟧ — Draft · no sprint — Ingest you can trust — …
# raw SPRINT-02 frontmatter
epics:
  - EPIC-002
stories:
  - STORY-002-01
  …
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/wiki/relations.ts`: sprint-plan member lists as a membership source (children of the sprint; the sprint per member).
- `cleargate-cli/src/wiki/page-schema.ts`: identity line and index rows (member sprint with `(planned)`; no self-reference on sprint pages).
- Ingest's affected-page refresh: editing a sprint plan's lists refreshes the members' pages ([[STORY-063-13]] keeps build and ingest equal).

**Do NOT modify:** the brief's Planned count; `cleargate sprint add|remove`.

## Task Breakdown
- [ ] QA-Red: the scenarios below, build and ingest.
- [ ] Membership from sprint-plan lists in relations; labels in page-schema.
- [ ] Ingest refreshes member pages when a sprint plan's lists change.
- [ ] Typecheck; relations, index and ingest-parity tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/sprint-plan-membership.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | a full build and an ingest after `sprint add` must agree |
| Interfaces | T | sprint page, member page and index row |
| Data | T | planned vs active sprint; an item listed twice |
| Rules | T | an item's own `sprint_cleargate_id` wins |

```gherkin
Feature: A sprint plan's members are its members in the wiki

  @interfaces
  Scenario: The sprint page lists its members
    Given a Draft SPRINT-02 whose frontmatter lists EPIC-002 and STORY-002-01
    When cleargate wiki build runs
    Then wiki/sprints/SPRINT-02.md has children EPIC-002 and STORY-002-01

  @interfaces @data
  Scenario: A planned member names its sprint
    Given EPIC-002 with sprint_cleargate_id null, listed by Draft SPRINT-02
    When cleargate wiki build runs
    Then EPIC-002's page and its index row read "SPRINT-02 (planned)"

  @rules
  Scenario: The item's own sprint wins
    Given EPIC-002 with sprint_cleargate_id SPRINT-03, also listed by Draft SPRINT-02
    When cleargate wiki build runs
    Then EPIC-002's page reads "SPRINT-03"

  @paths
  Scenario: Ingest matches build after sprint add
    Given a built wiki
    When cleargate sprint add SPRINT-02 EPIC-002 runs and the hook ingests the sprint file
    Then EPIC-002's page equals what a full build writes

  @interfaces
  Scenario: A sprint page does not name itself as its sprint
    When cleargate wiki build runs
    Then no sprint page or sprint index row reads "Sprint: none", "no sprint" or its own id in the sprint slot
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per scenario |
| Integration tests | 1 | build-vs-ingest parity on a fixture corpus |
| E2E / acceptance tests | 0 | the next field build |

---

## Prior work

- [[STORY-063-13]] (Completed, 0.30.0): computed relations from `parent_ref` / `parent_epic_ref` / `parent`; sprint-plan lists were not a source.
- [[STORY-063-09]] (Completed, 0.30.0): defined the index row's `<sprint | no sprint>` from `sprint_cleargate_id`.
- [[EPIC-062]]: `cleargate sprint add|remove`, the write path for the member lists.

## Context Source

**context_source:** field upgrade test 2026-11-13 addendum, reproduced on a pristine copy of the field repo; code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
