---
story_id: "STORY-002-01"
parent_epic_ref: "EPIC-002"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-002_Knowledge_Wiki.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-002-01: Add §10 "Knowledge Wiki Protocol" to Protocol

**Complexity:** L1.

## 1. The Spec
Add §10 describing: wiki layout, three operations (ingest/query/lint), backlink syntax `[[WORK-ITEM-ID]]`, gate-blocking lint behavior, page structure (metadata + summary + edges only), `log.md` YAML event shape.

## 2. Acceptance
```gherkin
Scenario: §10 complete
  When I read cleargate-protocol.md
  Then §10 describes ingest/query/lint, backlinks, gate-blocking lint, page schema, log.md format
```

## 3. Implementation
Edit `.cleargate/knowledge/cleargate-protocol.md`.

## Ambiguity Gate
🟢.
