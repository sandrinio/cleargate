---
story_id: STORY-067-02
parent_epic_ref: CR-067
parent_cleargate_id: CR-067
sprint_cleargate_id: SPRINT-28
carry_over: false
area: scripts,templates,migration
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
context_source: |
  Phase B of CR-067 — applies the migration script from STORY-067-01 to
  the real archive (~113 items) AND updates the 8 template files (live +
  canonical mirror) to drop Done/Verified from status enum guidance.
  Single atomic commit per phase per CR-067 §3.

  Depends on STORY-067-01 (script must exist). Sequential with STORY-067-03
  (reconciler tighten depends on Phase B complete).

  Mirror parity per FLASHCARD 2026-05-15 `#mirror #parity #three-way`:
  live templates + canonical templates + npm payload (rebuilt by prebuild).
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "'## Existing Surfaces' has no path citations and no \"no overlap found\" sentinel"
  last_gate_check: 2026-05-17T18:40:52Z
stamp_error: no ledger rows for work_item_id STORY-067-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T18:40:52Z
  sessions: []
---

# STORY-067-02: Apply Archive Migration + Update 8 Templates

**Complexity:** L2 — one script invocation against the real repo (bulk frontmatter rewrites) + 8 template edits (live + canonical mirror) + 1 prebuild verification.

## 1. The Spec

### 1.1 User Story

As CR-067's operator, I want to (a) run `migrate-status-to-completed --apply` against the real `.cleargate/delivery/` tree, capturing the ~113-item rewrite in a dedicated commit, and (b) update all 8 artifact templates (live + canonical) so future drafts use only `Completed` as terminal, so that the archive and the template surface speak one vocabulary.

### 1.2 Detailed Requirements

1. **Phase B application (one commit)**:
   - Acquire `.cleargate/.migration-lock`. Verify no concurrent push agent is dispatched.
   - Run `node cleargate-cli/scripts/migrate-status-to-completed.mjs --apply` against the real `.cleargate/delivery/` tree.
   - Capture the script's summary output in the commit message.
   - Commit: `chore(SPRINT-28): CR-067 Phase B — vocab migration Done|Verified → Completed (N items)`.
2. **Template updates** — for each of the 8 templates below, replace any "Done"/"Verified" terminal-status guidance with "Completed". Find-and-edit; preserve all other content byte-for-byte:
   - `.cleargate/templates/story.md`
   - `.cleargate/templates/Bug.md`
   - `.cleargate/templates/CR.md`
   - `.cleargate/templates/epic.md`
   - `.cleargate/templates/initiative.md`
   - `.cleargate/templates/Sprint Plan Template.md`
   - `.cleargate/templates/sprint_report.md`
   - `.cleargate/templates/hotfix.md`
   - **Mirror each in** `cleargate-planning/.cleargate/templates/` (same filenames).
3. **Prebuild verification**: after editing canonical templates, run `npm run prebuild` in cleargate-cli/; verify `cleargate-cli/templates/cleargate-planning/.cleargate/templates/*.md` reflects the edits (this directory is gitignored per FLASHCARD 2026-05-01 `#scaffold #mirror #prebuild` and FLASHCARD 2026-05-15 `#mirror #parity #prebuild` — do not git-add, just verify diff against canonical returns empty post-prebuild).
4. **Flagged items report** — the script's "Flagged for human review" list (per STORY-067-01 §1.2) lands in the PR description as a checklist for human triage. Do NOT auto-resolve.
5. **Lock release** — verify `.cleargate/.migration-lock` is removed after script exits.

### 1.3 Out of Scope

- Tightening `ARTIFACT_TERMINAL_STATUSES` to `['Completed']` only (STORY-067-03).
- Editing `lifecycle-reconcile.ts` gate-check expectations at lines 47/51/309 (STORY-067-03).
- Editing the migration script itself (STORY-067-01).
- Editing `close_sprint.mjs` literal status references (STORY-067-03 covers if any remain).
- MCP adapter mapping documentation (STORY-067-03).

### 1.4 Open Questions

None — pure execution + template find-and-replace.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Concurrent `cleargate push` during Phase B corrupts a frontmatter | `.migration-lock` enforces serialization (STORY-067-01); orchestrator MUST NOT dispatch push agents during Phase B execution window |
| Template grep misses a Done/Verified reference inside a code block | Manual review of the 8-template diff before commit; QA verifies via `rg "Done\\|Verified" .cleargate/templates/` returns only intended references |
| Prebuild fails to regenerate templates payload | Run `diff -r .cleargate/templates/ cleargate-planning/.cleargate/templates/` and `diff -r cleargate-planning/.cleargate/templates/ cleargate-cli/templates/cleargate-planning/.cleargate/templates/` — both empty before commit |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/scripts/migrate-status-to-completed.mjs` (from STORY-067-01) — script runner.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — runs in prebuild; rebuilds `cleargate-cli/templates/cleargate-planning/` from `cleargate-planning/`.
- **Surface:** `.cleargate/templates/*.md` + `cleargate-planning/.cleargate/templates/*.md` — 8 + 8 = 16 files to edit.
- **Coverage of this story's scope:** ~95% — pure invocation + find/replace; no new code.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** skip the template update; let archive migration alone suffice.
- **Why isn't extension sufficient?** Without template updates, future drafts use the stale enum guidance and re-introduce Done/Verified into the archive. CR-067 §4 success metric "zero matches for `status: Done|Verified` in delivery/" requires both archive migration AND template update. Doing both in one story keeps the commit story clean — Phase B is a single semantic unit.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Archive migration + template update applied

  Scenario: Archive migration runs cleanly against real repo
    Given STORY-067-01 has merged
    When `node cleargate-cli/scripts/migrate-status-to-completed.mjs --apply` runs against .cleargate/delivery/
    Then rg "status:\\s*Done|status:\\s*Verified" .cleargate/delivery/ returns zero matches
    And the script's summary reports the rewrite count
    And .cleargate/.migration-lock is removed at the end

  Scenario: All 8 templates updated in live mirror
    Given Phase B commit has landed
    When rg "Done|Verified" .cleargate/templates/ filters out intentional historical refs
    Then no remaining "status: Done" or "status: Verified" guidance lines exist
    And every template lists "Completed" as the sole terminal-status example

  Scenario: Canonical mirror parity
    Given Phase B commit has landed
    When diff -r .cleargate/templates/ cleargate-planning/.cleargate/templates/ runs
    Then exit code is 0 (empty diff)

  Scenario: NPM payload regenerated by prebuild
    Given canonical templates have been edited
    When `npm run prebuild` in cleargate-cli/ runs
    Then cleargate-cli/templates/cleargate-planning/.cleargate/templates/ contains the updated templates
    And diff against canonical returns empty

  Scenario: Flagged items surfaced for human triage
    Given the script encountered stale Approved/Draft/Triaged items
    When Phase B commit ships
    Then the PR description lists those items as unchecked checkboxes for human triage
    And no automated rewrite was applied to them
```

### 2.2 Verification Steps (Manual)

- [ ] After Phase B commit, `rg "status:\s*Done|status:\s*Verified" .cleargate/delivery/` returns zero matches.
- [ ] `rg "status:\s*Completed" .cleargate/delivery/archive/ | wc -l` is roughly 220+ (existing 107 Completed + 101 ex-Done + 12 ex-Verified).
- [ ] No `.cleargate/.migration-lock` file present post-run.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/migrate-status-to-completed.mjs` (run; not edit) |
| Template Files (live) | `.cleargate/templates/{story,Bug,CR,epic,initiative,Sprint Plan Template,sprint_report,hotfix}.md` (8 files) |
| Template Files (canonical) | `cleargate-planning/.cleargate/templates/*` (8 mirror files) |
| Archive Files (bulk) | `.cleargate/delivery/{pending-sync,archive}/**/*.md` — script-mutated, not hand-edited |
| New Files Needed | No |

### 3.2 Technical Logic

1. Verify no concurrent push agent is dispatched (orchestrator-level constraint).
2. Run dry-run first; review the diff with human; halt if anything unexpected.
3. Run `--apply`. Capture summary stdout.
4. Edit 8 templates (live). Use sed or hand-edit; preserve byte-level fidelity outside the targeted lines.
5. Mirror edits to canonical 8 templates.
6. Run `npm run prebuild` in cleargate-cli/; verify payload diff empty.
7. Stage all changes; commit with the message format from §1.2 step 1.
8. Push the flagged-items report into the PR description.

### 3.3 API Contract

N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Repo-state assertion | 1 | `rg "status:\\s*Done|status:\\s*Verified" .cleargate/delivery/` returns 0 lines |
| Mirror parity | 2 | live↔canonical empty diff; canonical↔npm-payload empty diff |

### 4.2 Definition of Done

- [ ] Phase B commit landed; rg-zero assertion green.
- [ ] All 8 live templates updated.
- [ ] All 8 canonical templates updated.
- [ ] Prebuild regenerated npm payload; diff empty.
- [ ] `.migration-lock` removed post-run.
- [ ] Flagged-items list lands in PR description.
- [ ] `npm run typecheck` + `npm test` green across packages.

## Existing Surfaces

> See §1.6.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — execution + find/replace only.
