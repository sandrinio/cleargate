---
story_id: "STORY-002-08"
parent_epic_ref: "EPIC-002"
status: "Completed"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-002_Knowledge_Wiki.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
shipped_commit: "7d5ebcb"
completed_at: "2026-04-19T05:30:00Z"
sprint_id: "SPRINT-04"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-002-08: `cleargate wiki lint` Command

**Complexity:** L2.

## 1. The Spec
Invokes the lint subagent. Prints diagnostics. Non-zero exit code on any finding. Invoked by gate transitions and manually by the user.

### Options
- `--rebuild` — fix drift by regenerating from raw state (wraps `wiki build`)

## 2. Acceptance
```gherkin
Scenario: Clean wiki exits 0
  Given wiki consistent with raw state
  When cleargate wiki lint
  Then exit 0 with "OK"

Scenario: Drift exits non-zero
  Given wiki index.md missing an item that exists in raw
  Then exit > 0 with diagnostic

Scenario: Auto-fix
  When cleargate wiki lint --rebuild
  Then drift disappears, exit 0
```

## 3. Implementation
- `cleargate-cli/src/commands/wiki-lint.ts`

## Ambiguity Gate
🟢.
