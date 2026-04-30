---
story_id: STORY-005-01
parent_epic_ref: EPIC-005
parent_cleargate_id: "EPIC-005"
sprint_cleargate_id: "SPRINT-03"
status: Completed
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-003_MCP_Adapter.md
sprint_id: SPRINT-03
shipped_commit: a3d9227
setup_fix_commit: cad6638
completed_at: 2026-04-18T10:00:00Z
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-004-02
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:45.639Z
push_version: 3
---

# STORY-005-01: `cleargate-admin create-project`

**Complexity:** L1.

## 1. The Spec
CLI subcommand that calls `POST /admin-api/v1/projects` and prints the new `project_id`.

## 2. Acceptance
```gherkin
Scenario: Create
  Given admin JWT configured
  When cleargate-admin create-project --name "X"
  Then stdout contains the new project_id
```

## 3. Implementation
- `mcp/scripts/commands/create-project.ts`

## Ambiguity Gate
🟢.
