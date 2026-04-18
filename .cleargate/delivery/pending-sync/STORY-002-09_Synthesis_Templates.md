---
story_id: "STORY-002-09"
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

# STORY-002-09: Ship `active-sprint.md` + `open-gates.md` Synthesis Templates

**Complexity:** L1.

## 1. The Spec
Ship two synthesis page templates in `cleargate-cli/assets/synthesis/`. Copied to `wiki/synthesis/` by `cleargate init`. Auto-maintained by ingest (refresh on every ingest per EPIC-002 Q6).

### Pages
- `active-sprint.md` — currently active sprint deliverables + blocked items
- `open-gates.md` — all items awaiting Gate 1 / Gate 2 / Gate 3 review

## 2. Acceptance
```gherkin
Scenario: Init ships synthesis
  Given cleargate init on a new repo
  Then wiki/synthesis/active-sprint.md + wiki/synthesis/open-gates.md exist

Scenario: Ingest refreshes synthesis
  Given a gate transition on an item
  When wiki ingest fires
  Then open-gates.md reflects the new state
```

## 3. Implementation
- `cleargate-cli/assets/synthesis/active-sprint.md`
- `cleargate-cli/assets/synthesis/open-gates.md`

## Ambiguity Gate
🟢.
