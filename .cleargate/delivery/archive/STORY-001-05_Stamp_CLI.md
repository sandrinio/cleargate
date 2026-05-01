---
story_id: STORY-001-05
carry_over: true
parent_epic_ref: EPIC-001
parent_cleargate_id: "EPIC-001"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-001_Document_Metadata.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:28.683Z
push_version: 3
---

# STORY-001-05: `cleargate stamp <file>` CLI Command

**Complexity:** L1 — wires helpers into a Commander subcommand.

## 1. The Spec
`cleargate stamp <file>` invokes `stamp-frontmatter` using `codebase-version`. Returns exit 0 on success. Supports `--dry-run` to print what would change without writing.

## 2. Acceptance
```gherkin
Scenario: Stamp a file
  When `cleargate stamp path/to/file.md`
  Then exit 0 and file's frontmatter is updated

Scenario: Dry-run
  When `cleargate stamp path/to/file.md --dry-run`
  Then stdout shows the planned diff but file is unchanged
```

## 3. Implementation
- `cleargate-cli/src/commands/stamp.ts`

## 4. Quality Gates
- Unit + CLI integration

## Ambiguity Gate
🟢.
