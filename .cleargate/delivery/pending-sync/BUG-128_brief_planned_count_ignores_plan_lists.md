---
bug_id: BUG-128
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: session-brief
status: Draft
severity: P2-Medium
reporter: orchestrator (field upgrade watch 0.27.0 → 0.30.1 in a Python target repo, 2026-11-13)
approved: false
context_source: "Field upgrade watch 2026-11-13: the target repo's first 0.30.1 brief, checked against its two open sprint plans' frontmatter lists; code grounding at cli main dbccc79: src/wiki/synthesis/session-brief.ts:383-396 (Planned members = items whose sprint_cleargate_id names the sprint), src/wiki/relations.ts:155-170 (computeSprintMembership, BUG-125: plan lists are membership), BUG-125 §4 Do NOT modify (the brief's Planned count was left out)"
created_at: 2026-11-13T09:14:26.330Z
updated_at: 2026-11-13T09:14:26.330Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:16:41Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-128
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:16:40Z
  sessions: []
last_contradict_sha: "ebe6e4361c5bd93eeb4489ee394097fa13be2fd54ddad02558af7d72ae3a9d23"
---

# BUG-128: The brief's Planned line counts 0/0 for a sprint plan that lists its members

### Open Questions

- **Question:** Which items count as a planned sprint's members?
- **Recommended:** The union of the items its plan lists (`computeSprintMembership`, the rule BUG-125 made for sprint pages and the index) and the items whose `sprint_cleargate_id` names it, each counted once. Then the brief, the sprint page and the index agree.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `Planned: SPRINT-20 — <green>/<members> 🟢`, where members are the items the plan lists, as on its sprint page.

**Actual Behavior:** `Planned: SPRINT-20 — 0/0 🟢; SPRINT-32 — 0/0 🟢`. The Planned count (`session-brief.ts:383-396`) counts only items whose `sprint_cleargate_id` names the sprint. It ignores the plan's own `epics`/`stories`/`bugs`/`crs`/`proposals` lists, which BUG-125 made membership for sprint pages and the index. A repo that never used `cleargate sprint add` (added in 0.28) has no `sprint_cleargate_id` on its items, so every planned sprint reads 0/0. The agent in the field repo concluded that SPRINT-20 "has no members"; its frontmatter lists one epic, six bugs, one CR and one spike.

## 2. Reproduction Protocol
1. A repo with an open sprint plan `SPRINT-20` whose frontmatter lists `epics: [EPIC-057]` and `bugs: [BUG-314, BUG-315]`, and none of those three items carries `sprint_cleargate_id`.
2. `cleargate wiki build`.
3. Read the `Planned:` line in `.cleargate/wiki/brief.md`.

Edge conditions:
- An item both listed and carrying `sprint_cleargate_id: SPRINT-20` counts once.
- An item that only carries `sprint_cleargate_id: SPRINT-20` still counts (today's behaviour).
- A listed id with no raw file is not counted (as on the sprint page).
- A sprint plan is never its own member (G-M2-66).

## 3. Evidence & Context
Field `brief.md` after `cleargate wiki build` on 0.30.1:
```
Planned: SPRINT-20 — 0/0 🟢; SPRINT-32 — 0/0 🟢
```
SPRINT-20 frontmatter in the same repo:
```
epics:
  - EPIC-057
bugs:
  - BUG-314
  - BUG-315
  - BUG-316
  - BUG-317
  - BUG-318
  - BUG-323
crs:
  - CR-235
```
`command grep -rl 'sprint_cleargate_id: "\?SPRINT-20' .cleargate/delivery | wc -l` → `0`.

`src/wiki/synthesis/session-brief.ts:389-393`:
```ts
      const members = allItems.filter((i) => {
        if (i.bucket === 'sprints') return false; // G-M2-66: sprint files are not members
        const s = i.fm['sprint_cleargate_id'];
        return s !== undefined && s !== null && String(s).trim() === sid;
      });
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/wiki/synthesis/session-brief.ts` (Planned section, :383-396).
- `cleargate-cli/src/wiki/relations.ts` (reuse `computeSprintMembership`; no change expected).
- `cleargate-cli/scripts/brief-oracle.sh` (the oracle's planned fact must keep agreeing).

**Do NOT modify:** sprint page and index membership (BUG-125); `cleargate sprint add|remove`.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/brief-planned-membership.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one brief build path |
| Interfaces | F | the brief only; sprint pages already use plan lists |
| Data | T | listed only, stamped only, both, dangling id |
| Rules | T | each member counted once; a sprint is not its own member |

```gherkin
Feature: The brief counts a planned sprint's members from its plan

  @data
  Scenario Outline: Members are counted however they joined the sprint
    Given an open sprint plan SPRINT-20 and <items>
    When the brief is built
    Then the Planned line shows "SPRINT-20 — <green>/<count> 🟢"

    Examples:
      | items                                                         | green | count |
      | EPIC-057 and BUG-314 listed in the plan, neither stamped      | 0     | 2     |
      | BUG-400 stamped sprint_cleargate_id SPRINT-20, not listed     | 0     | 1     |
      | BUG-314 listed and stamped                                     | 0     | 1     |
      | BUG-999 listed with no raw file                                | 0     | 0     |

  @rules
  Scenario: A 🟢 listed member is counted as green
    Given SPRINT-20 lists BUG-314 and BUG-314's ambiguity is 🟢
    When the brief is built
    Then the Planned line shows "SPRINT-20 — 1/1 🟢"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per example row plus the green rule |
| Integration tests | 1 | `brief-oracle.sh` agrees on the listed-only fixture |
| E2E / acceptance tests | 0 | the next field brief |

---

## Prior work

- [[BUG-125]] (Completed, 0.30.1): made plan lists membership for sprint pages and the index; its Do-NOT-modify list left the brief's Planned count out. Its note that the brief already counted plan members held only in a repo whose items were stamped by `cleargate sprint add`.
- [[STORY-063-11]] (Completed, 0.30.0): specified the Planned count as "items whose `sprint_cleargate_id` names it".
- [[BUG-124]] (Completed, 0.30.1): other brief labels.

## Context Source

**context_source:** field upgrade watch 2026-11-13 (Python target repo, 0.27.0 → 0.30.1); code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
