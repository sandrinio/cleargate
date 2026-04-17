---
story_id: "STORY-002-07"
parent_epic_ref: "EPIC-002"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-002_Knowledge_Wiki.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-002-07: `cleargate wiki ingest <file>` Command

**Complexity:** L2.

## 1. The Spec
Single-file ingest invoked by the PostToolUse hook. Updates that file's wiki page, refreshes `index.md` entry, appends `log.md` entry. Atomic write-temp-then-rename for `index.md`.

## 2. Acceptance
```gherkin
Scenario: Single file update
  Given a raw file edited
  When cleargate wiki ingest <path>
  Then that file's wiki page + index.md entry + log.md reflect the new state
  And other wiki pages untouched
```

## 3. Implementation
- `cleargate-cli/src/commands/wiki-ingest.ts`

## Ambiguity Gate
🟢.
