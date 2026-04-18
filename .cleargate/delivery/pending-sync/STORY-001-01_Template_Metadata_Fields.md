---
story_id: "STORY-001-01"
parent_epic_ref: "EPIC-001"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-001_Document_Metadata.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-001-01: Add Metadata Fields to All 7 Templates

**Complexity:** L1 — purely file edits.

## 1. The Spec
Add `created_at`, `updated_at`, `created_at_version`, `updated_at_version`, `server_pushed_at_version` (initially null) to the YAML frontmatter of every template in `.cleargate/templates/`.

## 2. Acceptance
```gherkin
Scenario: All templates stamped
  When I grep frontmatter of each template in .cleargate/templates/
  Then all contain created_at, updated_at, created_at_version, updated_at_version fields
  And write templates (epic/story/bug/CR/proposal) also contain server_pushed_at_version: null
```

## 3. Implementation
Edit all 7 files: `initiative.md`, `epic.md`, `story.md`, `Bug.md`, `CR.md`, `proposal.md`, `Sprint Plan Template.md`.

## 4. Quality Gates
- Manual diff review; no functional code change

## Ambiguity Gate
🟢.
