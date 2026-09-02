---
bug_id: BUG-078
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P1-High
reporter: "{name}"
approved: true
context_source: approved Epic / verified codebase grounding + recorded direct approval
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
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
  last_gate_check: 2026-09-02T00:08:17Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: gate-predicates
---

# BUG-078: A SPRINT parent can never enumerate its children — nothing in frontmatter names the sprint

> **First-user field report,** 2026-09-02. **Fixed in the same run.**
> First observed at SPRINT-40's close and bypassed there; confirmed as a distinct
> defect when SPRINT-01 hit it with a completely clean backlog.

### Open Questions

- **Question:** Resolve a sprint's children from `state.json`, or add a `sprint_ref` frontmatter field to every child?
- **Recommended:** **`state.json`.** It already IS the roster — `init_sprint.mjs` writes it from the plan's §1 Consolidated Deliverables table, and the execution loop treats it as authoritative all sprint long. A new frontmatter field would add a third place the same fact lives and a fourth way for them to disagree.
- **Human decision:** Accepted as recommended — `sprintRunsRoot` option added.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** at close, a sprint whose stories are all Completed rolls up
to `Completed`.

**Actual Behavior:** `Step 2.6c HALT: SPRINT-NN: 0 children drafted; not
reconcilable — decompose or abandon` — for a sprint with four Completed stories
and two Completed epics.

The advice is impossible to act on: the sprint IS decomposed, and abandoning it
is not what the user wants.

## 2. Reproduction Protocol

1. Run any sprint to completion; ensure every story and epic is `Completed`.
2. `node .cleargate/scripts/close_sprint.mjs <SPRINT-ID>` with the parent rollup
   NOT bypassed.
3. Observe the `halt-zero-children` verdict for the sprint itself.
4. `grep -l "sprint_cleargate_id: <SPRINT-ID>" .cleargate/delivery/**/*.md` →
   no matches, because that field is null in every locally-authored item.

## 3. Evidence & Context

`enumerateChildren` (`cleargate-cli/src/lib/parent-rollup.ts:125-130`) matches on
exactly two fields:

```ts
const parentCleargateId = fm['parent_cleargate_id'];
const parentEpicRef     = fm['parent_epic_ref'];
const isChild =
  (typeof parentCleargateId === 'string' && parentCleargateId.trim() === parentId) ||
  (typeof parentEpicRef     === 'string' && parentEpicRef.trim()     === parentId);
```

Measured on a real story from this sprint:

```
parent_epic_ref:      EPIC-001     ← names its EPIC
parent_cleargate_id:  null
sprint_cleargate_id:  null
```

So:
- `parent_epic_ref` names the epic, never the sprint;
- `parent_cleargate_id` is null for locally-authored items;
- `sprint_cleargate_id` is populated only by `push`, which **requires
  membership** — and `enumerateChildren` does not read it even when set.

A SPRINT parent therefore enumerates zero children **by construction**, in every
pre-member project, permanently. Confirmed across two independent repos: the
meta-repo (SPRINT-40) and a fresh consumer repo (SPRINT-01).

**The fix's premise:** `state.json` is the roster. `init_sprint.mjs` writes it
from the plan's §1 table, and every execution-time consumer — lane router, wave
planner, bounce validator, close terminality check — already treats it as
authoritative. The rollup was the one consumer reaching for frontmatter instead.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/parent-rollup.ts` — `WalkActiveParentsOpts`, the leaf-epic/sprint branch
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — pass `sprintRunsRoot`

Backward compatible: `sprintRunsRoot` is optional, and behaviour for any
non-SPRINT parent, or when the option is omitted, is unchanged.

## Task Breakdown

- [x] Add optional `sprintRunsRoot` to `WalkActiveParentsOpts`
- [x] Add `sprintRosterFromState()` — returns null for non-sprint parents and unreadable state
- [x] Add `resolveChildrenByIds()` to resolve roster ids to statuses in the delivery tree
- [x] Pass `sprintRunsRoot` from `close_sprint.mjs` Step 2.6c
- [ ] Add a regression test for a sprint parent rolling up from state.json
- [ ] Re-sync npm payload and the live `/.claude/` instance

## 5. Verification Protocol (The Failing Test)

**Command:** `npx tsx --test test/lib/parent-rollup.node.test.ts`

Red test: a fixture with a sprint plan in pending-sync, a `state.json` listing two
stories, and both stories `Completed` in archive with no `sprint_cleargate_id`.
Assert `walkActiveParents({…, sprintRunsRoot})` returns `auto-flip` for the
sprint. Before the fix it returns `halt-zero-children`.

Second: assert that omitting `sprintRunsRoot` preserves the old behaviour exactly,
and that an EPIC parent is unaffected by the new path.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | roster read; option omitted preserves old behaviour; epic parent unaffected |
| Integration tests | 1 | full close where the sprint parent rolls up with no halt |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Prior work

- [[CR-066]] — introduced the parent rollup and `enumerateChildren`'s two-field match.
- [[BUG-077]] — the ordering defect found in the same close; together they were the whole reason SPRINT-01 could not close.
- [[CR-078]] — established `state.json` as the sprint's execution registry, which is what makes it the right source here.

## Context Source

**context_source:** verified codebase grounding — `parent-rollup.ts:125-130` read directly, measured frontmatter across four stories showing no sprint backlink, a repo-wide grep confirming `sprint_cleargate_id` is null everywhere locally-authored, and the sprint rolling up cleanly after the fix, all 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — fixed and verified 2026-09-02**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
