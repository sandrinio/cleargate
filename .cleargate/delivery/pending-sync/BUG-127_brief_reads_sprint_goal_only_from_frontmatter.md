---
bug_id: BUG-127
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: session-brief
status: Draft
severity: P2-Medium
reporter: orchestrator (field upgrade watch 0.27.0 → 0.30.1 in a Python target repo, 2026-11-13)
approved: false
context_source: "Field upgrade watch 2026-11-13: the target repo's first 0.30.1 brief, checked against its active sprint plan; code grounding at cli main dbccc79: src/wiki/synthesis/session-brief.ts:74-85 (goal read from fm['sprint_goal'] only), scaffold/core/.cleargate/templates/Sprint Plan Template.md:76 (goal written as the '- **Sprint Goal:** …' bullet, no sprint_goal key), .cleargate/scripts/init_sprint.mjs:308-316 (reads the bullet)"
created_at: 2026-11-13T09:14:26.150Z
updated_at: 2026-11-13T09:14:26.150Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:15:58Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-127
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:15:58Z
  sessions: []
last_contradict_sha: "2216336f37a911c26def92b6649a116dac7f219967803f61b62a90f2aa5d0dfd"
---

# BUG-127: The brief says "no goal" for every sprint plan made from the template

### Open Questions

- **Question:** Where should the brief read the goal from?
- **Recommended:** The `sprint_goal:` frontmatter key when it is set, otherwise the first `- **Sprint Goal:** …` bullet in the body — the same bullet `init_sprint.mjs` reads. Use one shared reader so the brief and `sprint-context.md` cannot disagree.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `Active sprint: SPRINT-NN — <first 15 words of the goal> — …` for a plan that states its goal the way the shipped Sprint Plan template asks.

**Actual Behavior:** `Active sprint: SPRINT-32 — no goal — …`. `activeSprintLine` reads only the `sprint_goal:` frontmatter key (`session-brief.ts:80`). The shipped template has no such key; it puts the goal in the `- **Sprint Goal:** {1 sentence}` bullet (template line 76), which is what `init_sprint.mjs:314` reads into `sprint-context.md`. So the brief shows "no goal" for any plan made from the template, in every repo. In this meta-repo only 6 of 44 sprint plans carry a `sprint_goal:` key.

## 2. Reproduction Protocol
1. A repo with an Active sprint plan made from the template: no `sprint_goal:` key, body bullet `- **Sprint Goal:** Ship the keygen command.`, and `.cleargate/sprint-runs/.active` naming it.
2. `cleargate wiki build`, then `cleargate doctor --session-start`.
3. Observe the `Active sprint:` line.

Edge conditions:
- A plan with a `sprint_goal:` key keeps today's text.
- A plan with neither prints `no goal`.
- A bullet with an empty value (`- **Sprint Goal:**` and nothing after it) prints `no goal`.

## 3. Evidence & Context
Field brief after `cleargate wiki build` on 0.30.1:
```
Active sprint: SPRINT-32 — no goal — …
```
The same plan's body, line 43: `- **Sprint Goal:** On an installation with repeating blocks switched on, …` (a 60-word sentence); its frontmatter has no `sprint_goal` key.

`src/wiki/synthesis/session-brief.ts:74-85`:
```ts
  let goal = 'no goal';
  ...
    const g = fm['sprint_goal'];
    const w = g === undefined || g === null ? [] : words(String(g));
    if (w.length > 0) goal = w.slice(0, 15).join(' ');
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/wiki/synthesis/session-brief.ts` (`activeSprintLine`, :74-85).
- `cleargate-cli/scripts/brief-oracle.sh` (the oracle's active-sprint fact must keep agreeing).

**Do NOT modify:** the Sprint Plan template; `init_sprint.mjs`.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/brief-sprint-goal.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one brief build path |
| Interfaces | F | only the brief's Active sprint line reads it |
| Data | T | key, bullet, both, neither |
| Rules | T | the key wins over the bullet |

```gherkin
Feature: The brief reads the sprint goal the template writes

  @data
  Scenario Outline: The goal is found where the plan states it
    Given an active sprint plan with <key> and <bullet>
    When the brief is built
    Then the Active sprint line shows "<goal>"

    Examples:
      | key                    | bullet                                   | goal                  |
      | no sprint_goal key     | "- **Sprint Goal:** Ship the keygen."    | Ship the keygen.      |
      | sprint_goal: "Ship A"  | no bullet                                | Ship A                |
      | no sprint_goal key     | no bullet                                | no goal               |
      | no sprint_goal key     | "- **Sprint Goal:**" with no text        | no goal               |

  @rules
  Scenario: The frontmatter key wins over the bullet
    Given sprint_goal "Ship A" and the bullet "- **Sprint Goal:** Ship B"
    When the brief is built
    Then the Active sprint line shows "Ship A"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per example row plus the precedence rule |
| Integration tests | 1 | `brief-oracle.sh` agrees on the bullet-only fixture |
| E2E / acceptance tests | 0 | the next field brief |

---

## Prior work

- [[STORY-063-11]] (Completed, 0.30.0): built the brief and specified the goal "from the sprint's `sprint_goal`"; this is where the mismatch came from.
- [[BUG-124]] (Completed, 0.30.1): fixed other brief labels; did not touch the goal.
- [[CR-129]] (Draft): structured goal verdict on sprint reports; adjacent, does not cover the brief reader.

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
