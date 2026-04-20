---
story_id: STORY-002-04
parent_epic_ref: EPIC-002
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-002_Knowledge_Wiki.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
shipped_commit: 8c82e30
completed_at: 2026-04-19T05:30:00Z
sprint_id: SPRINT-04
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:20.207Z
push_version: 3
---

# STORY-002-04: `cleargate-wiki-lint` Subagent Definition

**Complexity:** L2.

## 1. The Spec
Define the `cleargate-wiki-lint` subagent (Sonnet). Scans raw items + wiki pages; reports drift: orphans, broken backlinks, missing invalidation tracking from CRs, stale-summary detection. Exit code non-zero on any finding (gate-blocking).

## 2. Acceptance
```gherkin
Scenario: Orphan detected
  Given a story with parent_epic_ref pointing to missing EPIC
  When lint runs
  Then exit code > 0 and diagnostic names the orphan

Scenario: Stale summary
  Given a wiki page's summary references removed blast-radius items
  When lint runs
  Then the page is flagged for rebuild
```

## 3. Implementation
- `cleargate-cli/assets/subagents/cleargate-wiki-lint.md`

## Ambiguity Gate
🟢.
