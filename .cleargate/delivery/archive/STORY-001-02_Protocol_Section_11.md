---
story_id: STORY-001-02
parent_epic_ref: EPIC-001
status: Draft
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-001_Document_Metadata.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:22.924Z
push_version: 3
---

# STORY-001-02: Add §11 "Document Metadata Lifecycle" to Protocol

**Complexity:** L1.

## 1. The Spec
Add §11 to `.cleargate/knowledge/cleargate-protocol.md` describing: field semantics, stamp invocation rule, dirty-SHA convention, archive immutability, git-absent fallback, stale-detection threshold (≥1 merge commit between `updated_at_version` and HEAD).

## 2. Acceptance
```gherkin
Scenario: §11 present and complete
  When I read cleargate-protocol.md
  Then §11 exists with subsections: fields, stamp rule, dirty suffix, archive immutability, fallback, stale threshold
```

## 3. Implementation
Edit `.cleargate/knowledge/cleargate-protocol.md`.

## 4. Quality Gates
- Manual review for completeness

## Ambiguity Gate
🟢.
