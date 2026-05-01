---
story_id: STORY-010-05
parent_epic_ref: EPIC-010
parent_cleargate_id: "EPIC-010"
status: Done
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: Business stakeholder
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T22:39:19Z
stamp_error: no ledger rows for work_item_id STORY-010-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:05:46Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:27.147Z
push_version: 2
---

# STORY-010-05: Stakeholder-Authored Proposal Intake via `cleargate:proposal` Label

**Complexity:** L2 — extends the sync driver (010-04); new code is a filename-slug helper + the intake branch of sync.

## 1. The Spec

### 1.1 User Story
As a Business stakeholder, I want to draft a proposal in my PM tool by tagging an issue `cleargate:proposal`, so that my idea flows into the team's ClearGate backlog without me ever touching `.cleargate/`.

### 1.2 Detailed Requirements

**Sync driver extension** (touches `cleargate-cli/src/commands/sync.ts`):
After step 2 (pull updates) and before step 3 (conflict detection), run:
- `cleargate_detect_new_items({ label: "cleargate:proposal" })` from STORY-010-02.
- For each returned `RemoteItem` with no local counterpart:
  - Compute filename slug: `PROPOSAL-<remote_id_numeric>-remote-<kebab-title-first-40-chars>.md`. Example: `PROPOSAL-1099-remote-refund-flow-redesign.md`.
  - Write to `.cleargate/delivery/pending-sync/<filename>` with the proposal template + filled-in fields:
    - `proposal_id`: next available PROP-NNN (scan existing `pending-sync/` + `archive/` for max, add 1).
    - `remote_id`: the Linear issue ID.
    - `approved`: `false`.
    - `source`: `"remote-authored"`.
    - `last_pulled_by`: from identity.
    - `last_pulled_at`: now.
    - `last_remote_update`: `RemoteItem.updated_at`.
  - Body = the proposal template scaffold with `## 1. Initiative & Context` pre-populated from `RemoteItem.body`, other sections left as template placeholders for the Vibe Coder to complete during review.
  - Append sync-log entry: `op="pull-intake", target="PROPOSAL-NNN", remote_id=..., result="created"`.

**Agent triage surfacing** (no code — documentation in Protocol §14 via STORY-010-08):
- After sync, if new `remote-authored` proposals exist, sync stdout prints a grouped one-liner:
  *"📥 1 new stakeholder proposal pulled: PROPOSAL-032 (LIN-1099 'Refund flow redesign') — review at .cleargate/delivery/pending-sync/PROPOSAL-032-remote-refund-flow-redesign.md"*

**`cleargate-cli/src/lib/slug.ts`** (new tiny helper):
- `slugify(title: string, max: number = 40): string` — lowercase + replace non-`[a-z0-9]+` with `-` + trim dashes + truncate.
- `nextProposalId(projectRoot: string): Promise<number>` — scans existing files for `proposal_id: "PROP-NNN"`, returns max + 1.

**Idempotency:** re-running sync does not duplicate intake — the `remote_id` field on the existing local proposal is the dedupe key.

### 1.3 Out of Scope
Webhook-driven push (v1.1). Automatic approval of remote-authored proposals (always requires Vibe Coder review — `approved: false` on creation). Non-`cleargate:proposal` labels (future: `cleargate:epic`, `cleargate:bug`).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Stakeholder proposal intake

  Scenario: New labeled issue is pulled into pending-sync
    Given LIN-1099 exists with label "cleargate:proposal" and title "Refund flow redesign"
    And no local proposal has remote_id "LIN-1099"
    When cleargate sync
    Then .cleargate/delivery/pending-sync/PROPOSAL-032-remote-refund-flow-redesign.md is created
    And frontmatter has source: "remote-authored", approved: false, remote_id: "LIN-1099"
    And §1.1 Objective body starts with the Linear issue description

  Scenario: Re-sync does not duplicate intake
    Given LIN-1099 already has local counterpart PROPOSAL-032
    When cleargate sync runs again
    Then no new file is created
    And sync-log shows no "pull-intake" entry for LIN-1099

  Scenario: Unlabeled issues are ignored
    Given LIN-1100 has no "cleargate:proposal" label
    When cleargate sync
    Then no new local file is created for LIN-1100

  Scenario: Slug truncates and sanitizes
    Given LIN-2000 title is "Allow users — billing/accounts — to export CSVs & also PDFs !!!"
    When intake runs
    Then filename is PROPOSAL-033-remote-allow-users-billing-accounts-to-expor.md
    (truncated at 40 chars post-slugify)

  Scenario: nextProposalId scans both directories
    Given archive/ has PROP-030, pending-sync/ has PROP-031
    When nextProposalId is called
    Then result is 32

  Scenario: Intake surfaces in sync stdout
    Given 2 new stakeholder proposals in this sync
    When cleargate sync completes
    Then stdout contains "📥 2 new stakeholder proposals pulled"
    And each is listed with its filesystem path

  Scenario: Triage command references intake
    Given PROPOSAL-032 is remote-authored and approved=false
    When the Claude Code session starts and surfaces open items
    (Verified at SPRINT-07 via the SessionStart hook story; this story asserts only the file + log shape)
```

### 2.2 Verification Steps
- [ ] Manual: tag a Linear sandbox issue `cleargate:proposal`, run `cleargate sync`, inspect the created file.
- [ ] `grep -l "source: \"remote-authored\"" .cleargate/delivery/pending-sync/` returns the new file.

## 3. Implementation

**Files touched:**

- `cleargate-cli/src/lib/slug.ts` — **new** — `slugify()` + `nextProposalId()` helpers.
- `cleargate-cli/src/commands/sync.ts` — **modified** — intake branch (after pull, before conflict detect).

**Consumes:** `detect_new_items` MCP tool (010-02), sync-log (010-01), proposal template (already extended in 010-01).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — slugify | 4 | plain / special-chars / unicode / truncation |
| Unit — nextProposalId | 2 | both-dirs scan + gap handling |
| Unit — intake file shape | 2 | frontmatter matches spec; body contains remote body |
| Unit — idempotency | 1 | re-sync same remote_id = no-op |
| Integration — end-to-end intake | 1 | recorded `detect_new_items` fixture + fs assertions |

### 4.2 Definition of Done
- [ ] Two-terminal E2E: tag a sandbox Linear issue, run sync, review the file.
- [ ] No duplicate files on re-sync.
- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.

## Ambiguity Gate
🟢.
