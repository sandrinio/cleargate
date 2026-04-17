---
story_id: "STORY-002-02"
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

# STORY-002-02: `cleargate-wiki-ingest` Subagent Definition

**Complexity:** L2.

## 1. The Spec
Define the `cleargate-wiki-ingest` subagent (Haiku model). Reads a raw work item file, produces/updates the corresponding wiki page (metadata + summary + edges), appends log entry, updates `index.md` entry.

### Requirements
- Ships in `cleargate-cli/assets/subagents/cleargate-wiki-ingest.md`
- Copied to `.claude/agents/` by `cleargate init`
- Frontmatter: name, description, model (haiku)

## 2. Acceptance
```gherkin
Scenario: Ingest an Epic
  Given raw file .cleargate/delivery/pending-sync/EPIC-042.md
  When the subagent runs on it
  Then wiki/epics/EPIC-042.md exists with metadata, summary (≤2 sentences), edges
  And wiki/log.md has a new entry
  And wiki/index.md reflects the new item
```

## 3. Implementation
- `cleargate-cli/assets/subagents/cleargate-wiki-ingest.md`

## Ambiguity Gate
🟢 — project-local per EPIC-002 Q1.
