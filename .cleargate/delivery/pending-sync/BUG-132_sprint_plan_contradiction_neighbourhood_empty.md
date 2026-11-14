---
bug_id: BUG-132
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: wiki-contradict
status: Draft
severity: P3-Low
reporter: orchestrator (relayed from a Go target repo on 0.30.1, 2026-11-13; reproduced on this meta-repo's SPRINT-37)
approved: false
context_source: "Go target repo on 0.30.1 (its SPRINT-02 plan's contradiction neighbourhood was 0 pages), reproduced 2026-11-13 with cleargate wiki contradict on this meta-repo's Draft SPRINT-37 (neighborhood 0 []); code grounding at cli main dbccc79: src/lib/wiki/contradict.ts:455-535 (collectNeighborhood: [[ID]] body mentions, parent_epic_ref/parent, the parent's children, topics citing the parent), :538-546 (extractIdMentions matches [[ID]] only), src/wiki/relations.ts:155-170 (computeSprintMembership, BUG-125: plan lists are membership)"
created_at: 2026-11-13T09:14:27.050Z
updated_at: 2026-11-13T09:14:27.050Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:20:34Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-132
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:20:34Z
  sessions: []
last_contradict_sha: "6100f46c9d2425361dd16e533bb71f6d528030e4291cb8d542ccecd1c5384767"
---

# BUG-132: A sprint plan's contradiction check has no pages to compare against

### Open Questions

- **Question:** What is a sprint plan's neighbourhood?
- **Recommended:** The wiki pages of the items its frontmatter lists (`epics`, `stories`, `bugs`, `crs`, `proposals`, read the way `computeSprintMembership` reads them), and for each listed story, which has no page, its parent epic's page. Then the existing body-mention, topic and 12-page cap rules apply unchanged.
- **Human decision:** pending

- **Question:** Should bare IDs in the plan body (the §1 deliverables table writes `STORY-037-01`, not `[[STORY-037-01]]`) count too?
- **Recommended:** No. Mentions stay `[[ID]]`-only for every item type, as today; the frontmatter lists are the plan's declared members. A plan with no lists (older plans) stays empty and is handled by BUG-131's empty-neighbourhood skip.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** The contradiction check for a draft sprint plan compares it with the items it plans: its epics and the work items it lists.

**Actual Behavior:** `collectNeighborhood` (`contradict.ts:455-535`) builds the neighbourhood from `[[ID]]` body mentions, `parent_epic_ref`/`parent`, the parent's children, and topics citing the parent. A sprint plan has no parent, writes its members as bare IDs in tables, and lists them in frontmatter, which the collector does not read. Its members are mostly stories, which have no wiki pages, and its epic is often not listed under `epics`. So the neighbourhood is empty and the check compares the plan with nothing. In the field repo SPRINT-02's neighbourhood was 0 pages; in this meta-repo SPRINT-37 (which names EPIC-048 and its stories 15 times in prose) is also 0.

## 2. Reproduction Protocol
1. A Draft, unapproved sprint plan listing `epics: [EPIC-002]` and `stories: [STORY-002-01, STORY-002-02]` in frontmatter, with both stories' `parent_epic_ref: EPIC-002` and an `EPIC-002` wiki page, and no `[[ID]]` links in the plan body.
2. `cleargate wiki contradict <plan file>`.
3. Read the `neighborhood` array in the `phase4:` line.

Edge conditions:
- A plan listing only stories gets their parent epics' pages.
- A listed id with no wiki page and no parent adds nothing.
- An `[[ID]]` link in the plan body is still included.
- Non-sprint items keep today's neighbourhood exactly.
- The 12-page cap still applies.

## 3. Evidence & Context
This meta-repo, 0.30.1, `cleargate wiki contradict .cleargate/delivery/pending-sync/SPRINT-37_Connector_M2_Daemon_Hardening.md`, `phase4:` line parsed:
```
neighborhood 0 []
```
`command grep -c 'STORY-\|EPIC-048'` on the same file → `15` (all bare IDs, no `[[ ]]`).

Field report (Go repo, 0.30.1): the SPRINT-02 plan's neighbourhood was 0 pages; its members are stories (not ingested) and its epic is not listed under `epics`.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/wiki/contradict.ts` (`collectNeighborhood`: a sprint-plan branch reading the member lists).
- `cleargate-cli/src/wiki/relations.ts` (reuse the member-list reader behind `computeSprintMembership`; no behaviour change).

**Do NOT modify:** neighbourhoods of non-sprint items; the empty-neighbourhood skip (BUG-131); the excluded-bucket raw-file path (BUG-126).

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/contradict-sprint-neighbourhood.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one neighbourhood collector |
| Interfaces | F | `wiki contradict` only |
| Data | T | listed epics, listed stories, dangling ids, body links |
| Rules | T | non-sprint items unchanged; cap holds |

```gherkin
Feature: A sprint plan is checked against the items it plans

  @data
  Scenario Outline: The plan's members bring their pages
    Given a Draft sprint plan whose frontmatter lists <members>
    When cleargate wiki contradict runs on it
    Then the neighborhood is <pages>

    Examples:
      | members                                         | pages                          |
      | epics [EPIC-002]                                | epics/EPIC-002.md              |
      | stories [STORY-002-01] (parent EPIC-002)        | epics/EPIC-002.md              |
      | bugs [BUG-010] with a page, [BUG-011] without   | bugs/BUG-010.md                |
      | none, body links [[CR-005]]                     | crs/CR-005.md                  |

  @rules
  Scenario: Other items keep their neighbourhood
    Given a Draft bug with a parent epic and two [[ID]] links
    When cleargate wiki contradict runs on it
    Then the neighborhood equals the 0.30.1 neighborhood for the same fixture

  @rules
  Scenario: The cap still applies
    Given a Draft sprint plan listing 15 bugs with pages
    When cleargate wiki contradict runs on it
    Then the neighborhood has 12 pages and truncated is true
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | one per example row and rule |
| Integration tests | 0 | `collectNeighborhood` reads a fixture wiki; the unit test covers it |
| E2E / acceptance tests | 0 | the next field sprint plan |

---

## Prior work

- [[BUG-125]] (Completed, 0.30.1): made plan lists membership for sprint pages and the index; did not reach contradiction neighbourhoods.
- [[BUG-126]] (Completed, 0.30.1): excluded-bucket drafts; left neighbourhood selection alone.
- [[STORY-063-01]] (Completed, 0.30.0): the contradiction-check command pair.
- [[BUG-131]] (Draft): what an empty neighbourhood costs today.

## Context Source

**context_source:** Go target repo on 0.30.1; reproduced on this meta-repo's SPRINT-37; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
