---
story_id: STORY-001-04
carry_over: true
parent_epic_ref: EPIC-001
parent_cleargate_id: "EPIC-001"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-001_Document_Metadata.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:31.807Z
push_version: 3
---

# STORY-001-04: `stamp-frontmatter.ts` Helper

**Complexity:** L2.

## 1. The Spec
Idempotent YAML-frontmatter updater. On first run: sets `created_at` + `created_at_version`. On subsequent runs: updates only `updated_at` + `updated_at_version`. In `archive/`: no-op (freeze).

### Detailed Requirements
- Use `gray-matter` for frontmatter parse/serialize
- Preserve key ordering stable across runs (deterministic output)
- Never touch body content

## 2. Acceptance
```gherkin
Scenario: First stamp sets all
  Given a file without metadata fields
  When stamp(file)
  Then frontmatter has created_at, updated_at, created_at_version, updated_at_version populated

Scenario: Second stamp preserves created_at
  Given a stamped file
  When stamp(file) runs again seconds later
  Then created_at unchanged, updated_at advances

Scenario: Archive no-op
  Given a file under .cleargate/delivery/archive/
  When stamp(file)
  Then file unchanged
```

## 3. Implementation
- `cleargate-cli/src/utils/stamp-frontmatter.ts`

## 4. Quality Gates
- Unit: all three scenarios + dirty SHA + package.json fallback

## Ambiguity Gate
🟢.
