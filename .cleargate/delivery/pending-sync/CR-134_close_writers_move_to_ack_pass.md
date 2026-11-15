---
cr_id: CR-134
parent_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts
status: Draft
approved: false
context_source: "SPRINT-46 Goal check (d) sandbox run 2, finding S24 remainder (.cleargate/field-trials/2026-11-sandbox-s46.md); iteration-3-scoping.md §7 ('S24 writers in the no-flag pass (move 2.6d/2.6c with their judges to the ack pass) | none') and STORY-066-17 §1.3 ('Moving the 2.6d/2.6c writers (and their judges 2.6, 2.6b) to the ack pass: later'); filed under the owner's /goal delegation 2026-11-15"
created_at: 2026-11-15T11:36:29.248Z
updated_at: 2026-11-15T11:36:29.248Z
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
  last_gate_check: 2026-11-15T11:41:19Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-134: close_sprint.mjs writes statuses and archives only in the ack pass, never before the human's Gate 4 ack

## 0.5 Open Questions

- **Question:** The judges (Step 2.6 lifecycle reconciliation, Step 2.6b orphan drift) read frontmatter status, and BUG-077 fixed their order as writers first (2.6d, 2.6c) then judges. If the writers move to the ack pass, what does the no-flag pass judge?
- **Recommended:** Move the judges with the writers (as the scoping note says), and give the no-flag pass a read-only "would-be" check instead: a dry-run of 2.6d/2.6c (reconciler functions already return a flip list) that reports "would flip N stories / M parents, would archive ..." and fails only on states the writers cannot fix (a non-terminal story, a parent that needs a manual ack, the 2.6c HALT). The ack pass then runs writers, then judges, as today.
- **Human decision:** _open_
- **Question:** Do the Step 3/3.5/4 Reporter inputs depend on the writes (the report counts statuses and archived items)?
- **Recommended:** Audit before moving; if the Reporter bundle reads archive/ state, derive counts from `state.json` (the writers' own source) and keep the bundle write in the no-flag pass.
- **Human decision:** _open_
- **Question:** What does the Gate 4 prompt show for the pending writes?
- **Recommended:** Extend the finish plan that STORY-066-17 prints ("On --assume-ack close will: ...") with one line per writer: files to flip and archive.
- **Human decision:** _open_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "The no-flag pass is safe to run any time; the writers are idempotent so the finish commits them." Today the no-flag pass already flips story and parent frontmatter to Completed and moves items from pending-sync/ to archive/ (Steps 2.6d, 2.6c) before the report exists, before Step 2.8 can fail, and before the human's ack. A no-flag run that is then abandoned (or an ack that is refused) leaves the tree changed.

**New Logic (The New Truth):**
- Gate 4 is the human's permission. The no-flag pass writes only prep artifacts it owns (the Reporter bundle, the doc-refresh checklist, the prefilled report stub) and reports what the ack will change; Steps 2.6d and 2.6c, with their judges 2.6 and 2.6b, run in the ack pass (`--assume-ack` + `CLEARGATE_CI_ACK=1`), in the BUG-077 order (2.6d, 2.6c, 2.6, 2.6b), before the Step 5 status flip.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: [[STORY-066-17]] (moves read-only 2.7/2.8 ahead of the writers; this CR builds on that order and on its finish plan; merge after it)
- [ ] Invalidate/Update Story: [[STORY-066-18]] (also edits close_sprint.mjs and enforcement §12/§14; sequence)
- [ ] Invalidate/Update: BUG-077 round-trip tests pinning "judges see writers' output" (`close-sprint-step-2-6c*.node.test.ts`)
- [x] Database schema impacts? No.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:600-660` — Step 2.6d same-sprint story backsync (flip + archive), runs in every pass.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:661-787` — Step 2.6c parent rollup (flip + archive, HALT on manual-ack parents).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:789-908` — Steps 2.6 and 2.6b, the judges.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1454-1461` — Step 5 status flip, already ack-only.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:577-598` — the BUG-077 ordering comment these steps must keep.
- **Why this CR extends rather than rebuilds:** the writers and judges exist and are correct; only the pass they run in changes, plus a read-only preview. STORY-066-17 already introduces the pre-ack finish plan and the ack-only Step 5/7.8 writes.

## Prior work

- [[STORY-066-17]] (names this remainder as later, §1.3), [[CR-022]] (Gate 4 close pipeline), [[CR-017]] (lifecycle reconciler), [[CR-066]] (parent rollup), [[BUG-077]] (writer/judge order), [[BUG-032]] (story backsync). No item moves the writers behind the ack.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs`
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` (§12 / §14 step meanings)
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` (§E sequence table) and the regenerated Codex copy
- `cleargate-cli/test/scripts/close-sprint-step-2-6c.red.node.test.ts`, `close-sprint-step-2-6c-archive.node.test.ts`, `close-sprint-step-2-6c.live.integration.node.test.ts`, `test_close_sprint_v21.integration.node.test.ts`

Live `.cleargate/scripts` and `.claude/` re-sync after merge; every canonical script edit adds live-parity reds until then.

## Task Breakdown

- [ ] Red test: a no-flag run leaves every frontmatter status and every file location unchanged (git diff of the tree is empty) -> Scenario 1
- [ ] Add the read-only preview of 2.6d/2.6c (would-flip, would-archive, would-HALT) and print it with the finish plan -> Scenario 2
- [ ] Gate the writers and judges on `assumeAck`, keep BUG-077 order in the ack pass -> Scenario 3
- [ ] Audit Steps 3/3.5/4 inputs for a dependency on written statuses (Open Question 2) -> Scenario 1
- [ ] Update enforcement §12/§14, SKILL §E, regenerate Codex; update the pinned tests

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npx tsx --test test/scripts/close-sprint-step-2-6c.red.node.test.ts test/scripts/test_close_sprint_v21.integration.node.test.ts`

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | No-flag and ack passes are different successful ways through. |
| Interfaces | T | The Gate 4 prompt (preview) and the writes. |
| Data | F | Same behaviour for stories and parents; the ack pass keeps today's per-kind logic. |
| Rules | T | A state the writers cannot fix fails the no-flag pass; no write before the ack. |

```gherkin
Feature: Close writes nothing before the human's ack

  @paths @interfaces
  Scenario: The no-flag pass changes no tracked file
    Given a fixture sprint with Done stories in pending-sync/ and an Approved parent epic
    When close_sprint.mjs SPRINT-99 runs with no flags
    Then no frontmatter status changed and no file moved
    And the output lists the stories and parents the ack will flip and archive

  @rules
  Scenario: A state the writers cannot fix still stops the no-flag pass
    Given a story still In Progress
    When close_sprint.mjs SPRINT-99 runs with no flags
    Then it exits 1 naming the story, with nothing written

  @paths
  Scenario: The ack pass writes in the BUG-077 order and passes the judges
    Given the same fixture and CLEARGATE_CI_ACK=1
    When close_sprint.mjs SPRINT-99 --assume-ack runs
    Then 2.6d, 2.6c, 2.6, 2.6b run in that order, statuses are Completed and files are in archive/
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Orchestration in one script; covered by integration |
| Integration tests | 3 | Fixture sprints through the real script with a tree snapshot diff, no mocks |
| E2E / acceptance tests | 0 | Goal check (d) re-run close in a worktree and a plain checkout |

---

## Context Source

**context_source:** SPRINT-46 Goal check (d), S24 remainder; iteration-3-scoping.md §7; STORY-066-17 §1.3.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [ ] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
- [ ] Open Question 1 (what the no-flag pass judges) has a human decision.
