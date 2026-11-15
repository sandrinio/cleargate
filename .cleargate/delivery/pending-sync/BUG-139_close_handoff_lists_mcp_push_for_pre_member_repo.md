---
bug_id: BUG-139
parent_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts
status: Draft
severity: P3-Low
reporter: orchestrator (SPRINT-46 Goal check d)
approved: false
context_source: "SPRINT-46 Goal check (d) sandbox runs 1 and 2, finding B12 (ORCHESTRATOR_FINDINGS.md) and S29 (.cleargate/field-trials/2026-11-sandbox-s46.md, 'Finding to item mapping': 'B12 ... new item'); iteration-3-scoping.md §7 ('B12 Step 8 lists push to MCP for a pre-member repo | none'); filed under the owner's /goal delegation 2026-11-15"
created_at: 2026-11-15T11:36:29.046Z
updated_at: 2026-11-15T11:36:29.046Z
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
  last_gate_check: 2026-11-15T11:38:40Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-139: Close Step 8 handoff lists "push to MCP" as a pending action for a pre-member repo, where it cannot run

### Open Questions

- **Question:** How does `close_sprint.mjs` learn the repo is pre-member? Options: (a) remember that Step 7/7.4's child exited with the "requires membership" message (`src/cli.ts:96`) and drop item 5 only then; (b) call `cleargate whoami --json` (state from `src/lib/membership.ts`) once before Step 7; (c) test for the token file directly.
- **Recommended:** (b), once, before Step 7, and reuse the result to skip Steps 7/7.4 with one "pre-member: sync skipped" line instead of two failing child processes. (a) is the smaller change but keeps the noisy warnings.
- **Human decision:** _open_
- **Question:** What replaces item 5 for a pre-member repo: nothing, or "Run: cleargate join <invite-url> to enable sync"?
- **Recommended:** The join line, as one optional item, since the CLAUDE.md banner rule says pre-member repos are directed to `cleargate join` rather than to push/sync.
- **Human decision:** _open_

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** The post-close handoff list (Step 8) only names actions the human can take. In a pre-member repo (no valid join token) sync and push cannot run, so the list does not ask for them; it points at `cleargate join` or says nothing.

**Actual Behavior:** Step 8 always prints "5. Push approved status changes to MCP if Step 7 warned (`cleargate sync work-items`)". In a pre-member repo Steps 7 and 7.4 fail with "requires membership" and are reported as warnings (correct), but the handoff then presents a command that exits 2 with the same message as an action item.

## 2. Reproduction Protocol
1. Fixture repo with ClearGate installed, no `~/.cleargate/auth.json` (point `HOME` at an empty dir), a sprint ready for the ack pass.
2. `CLEARGATE_CI_ACK=1 node .cleargate/scripts/close_sprint.mjs SPRINT-99 --assume-ack`.
3. Observe stderr "Step 7 warning: sync work-items failed" / "Step 7.4 warning: MCP push failed" and, in the final stdout, item 5 of "SPRINT-99 closed. Next steps".
4. Run the printed command: `cleargate sync work-items` exits 2, "requires membership. Run: cleargate join <invite-url>".

Edge conditions: member repo whose Step 7 succeeded (item 5 must be dropped or marked done, today it still prints "if Step 7 warned"); member repo where Step 7 failed for a network reason (item 5 stays); the pinned test text for item 5.

## 3. Evidence & Context
ORCHESTRATOR_FINDINGS.md B12: "Close Step 7 (sync/push) fails for a pre-member repo; reported as warnings only — fine, but the handoff list should not present it as a pending action when membership does not exist."
Field trial run 2, close at 11:17:49: "Steps 7/7.4 failed 'requires membership' (pre-member; warnings, correct)." Run 1: "Pre-member sync skipped with a `cleargate join` note (correct)." Mapping table: "B12 Step 8 lists MCP push for a pre-member repo | S29 | new item | later". S29 also notes Step 4 still says "spawn the Reporter" after the report exists (low; out of scope here).

Source (read 2026-11-15):
```
cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1517-1536  Step 7 sync work-items, catch -> warning
cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1650-1652  "5. Push approved status changes to MCP if Step 7 warned (`cleargate sync work-items`)"
cleargate-cli/src/cli.ts:96  "cleargate <cmd>: requires membership. Run: cleargate join <invite-url>"
cleargate-cli/src/lib/membership.ts  getMembershipState() -> 'member' | 'pre-member'
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` (Step 7, 7.4, 8)
- `cleargate-cli/test/scripts/test_close_sprint_v21.integration.node.test.ts` (Scenario 27 pins the item 5 text at `:1898`; keep it for the member case)
- `cleargate-cli/src/lib/membership.ts` (read only, reuse)

Coordinate with STORY-066-17, which edits the same Step 8 block (adds handoff item 7) and moves steps around it. Live re-sync after merge.

## Task Breakdown

- [ ] Red test: pre-member close prints no push/sync action in Step 8 -> Scenario 1
- [ ] Resolve membership once (Open Question 1) and share the result with Steps 7, 7.4 and 8 -> Scenario 1, 2
- [ ] Member case keeps the existing item 5 text and test -> Scenario 2
- [ ] Optionally print the `cleargate join` hint for pre-member (Open Question 2) -> Scenario 1

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npx tsx --test test/scripts/test_close_sprint_v21.integration.node.test.ts` (add scenarios beside Scenario 27)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Pre-member and member are different successful closes. |
| Interfaces | F | One stdout list. |
| Data | F | No behaviour differs by data shape. |
| Rules | T | Item 5 appears only where sync can run. |

```gherkin
Feature: The close handoff names only runnable actions

  @rules
  Scenario: Pre-member repo gets no sync action
    Given no join token
    When close_sprint.mjs SPRINT-99 --assume-ack completes (CLEARGATE_CI_ACK=1)
    Then Step 8 does not contain "cleargate sync work-items"
    And Step 7 and 7.4 are reported as skipped for membership, exit 0

  @paths
  Scenario: Member repo is unchanged
    Given a valid join token and a Step 7 failure
    When the close completes
    Then Step 8 item 5 is printed as today
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Output text only; covered by integration |
| Integration tests | 2 | Fixture close with and without a token (HOME seam) |
| E2E / acceptance tests | 0 | Observed in the Goal check (d) re-run close (pre-member sandbox) |

---

## Prior work

- [[CR-011]] (capability gating by membership), [[CR-022]] (Step 8 handoff list), [[STORY-066-17]] (edits the same close block; does not touch item 5). No item covers the pre-member handoff text.

## Context Source

**context_source:** SPRINT-46 Goal check (d), B12 / S29; iteration-3-scoping.md §7.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] Open Question 1 (how membership is detected) has a human decision.
