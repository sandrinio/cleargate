---
story_id: STORY-002-05
parent_epic_ref: EPIC-002
status: Completed
ambiguity: 🟡 Medium
complexity_label: L2
context_source: PROPOSAL-002_Knowledge_Wiki.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
shipped_commit: f98b2b8
completed_at: 2026-04-19T05:30:00Z
sprint_id: SPRINT-04
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:06.646Z
push_version: 3
---

# STORY-002-05: `cleargate init` Writes PostToolUse Hook

**Complexity:** L2 — spec verification needed at impl time.

## 1. The Spec
`cleargate init` appends a PostToolUse hook to `.claude/settings.json` that runs `npx cleargate wiki-ingest "$CLAUDE_TOOL_FILE_PATH"` after Write/Edit matching `.cleargate/(delivery|plans)/**`.

### Requirement
- Bounded block (HTML comments) inside settings.json so init can update safely
- Merge-safe: existing user hooks preserved

## 2. Acceptance
```gherkin
Scenario: Init writes hook
  Given a repo without .claude/settings.json
  When cleargate init runs
  Then .claude/settings.json exists with the PostToolUse hook block

Scenario: Init merges into existing config
  Given .claude/settings.json with unrelated user config
  When cleargate init runs
  Then user config preserved and cleargate block appended
```

## 3. Implementation
- `cleargate-cli/src/init/write-hooks.ts`

## 6. Open question
1. **Exact PostToolUse schema in current Claude Code** — verify via WebFetch before shipping. Default: follow latest docs.

## Ambiguity Gate
🟡 → 🟢 after spec verification.
