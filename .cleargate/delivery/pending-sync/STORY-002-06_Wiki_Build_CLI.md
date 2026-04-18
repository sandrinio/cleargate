---
story_id: "STORY-002-06"
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

# STORY-002-06: `cleargate wiki build` Command

**Complexity:** L2.

## 1. The Spec
Scan `.cleargate/delivery/**` + `.cleargate/plans/**`, regenerate the entire `wiki/` deterministically from raw state. Full rebuild; idempotent.

## 2. Acceptance
```gherkin
Scenario: Bootstrap from existing items
  Given 25 raw items in .cleargate/delivery/archive/
  When cleargate wiki build
  Then wiki/index.md + per-item pages + log.md are populated

Scenario: Rebuild yields byte-identical output
  Given a clean wiki build
  When rerun immediately
  Then no files change
```

## 3. Implementation
- `cleargate-cli/src/commands/wiki-build.ts`
- Orchestrates wiki-ingest against every raw file

## Ambiguity Gate
🟢.
