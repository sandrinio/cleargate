---
bug_id: BUG-077
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
area: sprint-scripts
---

# BUG-077: Parent rollup runs before child back-sync, so no parent can ever roll up on a first close

> **First-user field report,** 2026-09-02. **Fixed in the same run.**
> SPRINT-40's `CLEARGATE_SKIP_PARENT_ROLLUP` bypass had masked this completely —
> the bug is only visible if you actually let Step 2.6c run.

### Open Questions

- **Question:** Reorder the steps, or teach 2.6c to read `state.json` for child terminality?
- **Recommended:** **Reorder.** 2.6d exists precisely to make frontmatter agree with `state.json`; running the judge before the step that establishes the facts is the defect. Teaching 2.6c a second source of truth would leave two ways to answer the same question.
- **Human decision:** Accepted as recommended — 2.6d now precedes 2.6c.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** at close, a parent whose children are all Done rolls up to
`Completed` automatically.

**Actual Behavior:** every parent halts with `0/N children terminal`, naming
children that are Done in `state.json`. The close cannot proceed without a manual
ack for parents that are, in fact, complete.

## 2. Reproduction Protocol

1. Run any sprint to completion so every story is `Done` in `state.json`.
2. Do NOT hand-edit any story frontmatter (it will still read its in-flight
   status — `Approved`, `In Progress`, etc.).
3. `node .cleargate/scripts/close_sprint.mjs <SPRINT-ID>` — with
   `CLEARGATE_SKIP_PARENT_ROLLUP` unset.
4. Observe `Step 2.6c HALT: … 0/N children terminal — pending: <every child>`.
5. Note that Step 2.6d, which would have flipped those children to `Completed`,
   is printed AFTER the halt and therefore never runs.

## 3. Evidence & Context

Measured in a fresh consumer repo at SPRINT-01 close, all four stories merged:

| Source | STORY-001-01 … STORY-002-02 |
|---|---|
| `state.json` | `Done` (terminal) |
| frontmatter `status:` | `Approved` (non-terminal) |

Step order in `close_sprint.mjs` before the fix:

```
:587  // ── Step 2.6c: Parent (Epic/Sprint) Rollup (CR-066)
:665  // ── Step 2.6d: Same-Sprint Story Backsync (BUG-032)
```

2.6c judges a parent by its children's **frontmatter** status. 2.6d is the step
that sets that frontmatter from `state.json` — and it is 78 lines further down.
So on a first close the rollup always reads pre-backsync values.

2.6d's own header comment states the gap it exists to fill:
*"No prior step flipped same-sprint story frontmatter. This step fills that gap."*
It simply runs too late to fill it for 2.6c.

**After reordering, same sprint, same data:**

```
Step 2.6d: STORY-001-01 status Approved → Completed (state.json: Done) → archived
… (4 stories)
Step 2.6c: EPIC-001 status Draft → Completed (2/2 children Completed)
Step 2.6c: EPIC-002 status Draft → Completed (2/2 children Completed)
```

Both epics auto-flipped — an outcome that was structurally impossible before.

**Why it went unnoticed:** the only prior close in this codebase (SPRINT-40) was
run with `CLEARGATE_SKIP_PARENT_ROLLUP=1`, because its 14 pre-existing backlog
parents made the halt look like a backlog problem rather than an ordering one.
The bypass hid the ordering defect behind a legitimate-looking halt.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — the 2.6c / 2.6d block order

The two steps have no dependency in the 2.6d→2.6c direction; 2.6d reads
`state.json` and the delivery tree only.

## Task Breakdown

- [x] Move the Step 2.6d block ahead of Step 2.6c
- [x] Record the reason inline so the order is not "tidied" back later
- [x] Verify both epics auto-flip on a real sprint
- [ ] Add a regression test asserting 2.6d's output precedes 2.6c's
- [ ] Re-sync npm payload and the live `/.claude/` instance

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug077_close_step_order.red.sh`

Red test: a fixture sprint with all stories `Done` in `state.json` and
non-terminal frontmatter, and one parent epic. Run `close_sprint.mjs`; assert the
epic auto-flips to `Completed` and that 2.6c emits no halt. Before the fix it
halts `0/N children terminal`.

Second: assert Step 2.6d's stdout line appears BEFORE Step 2.6c's — a direct
guard against the order being reverted.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | step-order assertion on stdout sequence |
| Integration tests | 1 | full close: children back-synced, parent auto-flipped, no halt |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Prior work

- [[BUG-032]] — introduced Step 2.6d to fill the same-sprint backsync gap; this bug is that step being placed where it cannot serve the consumer that needs it most.
- [[CR-066]] — introduced Step 2.6c parent rollup.
- [[BUG-078]] — the other half of why SPRINT-01's close halted; found in the same run.

## Context Source

**context_source:** verified codebase grounding — the 2.6c/2.6d block positions read directly, a measured state.json-vs-frontmatter divergence across four stories in a fresh consumer repo, and both epics auto-flipping after the reorder, all 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — fixed and verified 2026-09-02**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
