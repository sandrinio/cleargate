---
type: epic
id: "EPIC-001"
parent: ""
children: 
  - "[[STORY-001-01]]"
  - "[[STORY-001-02]]"
  - "[[STORY-001-03]]"
  - "[[STORY-001-04]]"
  - "[[STORY-001-05]]"
  - "[[STORY-001-06]]"
cites: []
cited_by: 
  - "[[BUG-067]]"
  - "[[BUG-097]]"
  - "[[EPIC-002]]"
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-001_Document_Metadata_Lifecycle.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-001: Document Metadata Lifecycle

**Status:** Abandoned · **Sprint:** none · **Gate:** not run

## Objective
Implement automatic stamping of created_at, updated_at, created_at_version, updated_at_version (and pushed_at_version on push) into the YAML frontmatter of every ClearGate document. Ship the cleargate stamp CLI + codebase-version helper + MCP push-time integration.

## Problem & Value
**Why are we doing this?**
Without metadata, we cannot answer "when was this draft written? against what code state?" which makes CR blast-radius, stale detection, and cross-session continuity impossible. PROPOSAL-001 made the case; this Epic ships it.

[+406 bytes not shown — read .cleargate/delivery/archive/EPIC-001_Document_Metadata_Lifecycle.md]

## Scope
**In:**
- [ ] All 7 templates' frontmatter include `created_at`, `updated_at`, `created_at_version`, `updated_at_version` (and `pushed_at_version` for post-push types).
**Out:**
- PostToolUse hook as auto-enforcement (optional optimization; protocol rule sufficient for v1).
- Retroactive stamping of strategy-phase docs (PROP-001 Q7 resolved: forward-only).

[+731 bytes not shown — read .cleargate/delivery/archive/EPIC-001_Document_Metadata_Lifecycle.md]

## Architecture rules
- Flat string versions, not rich objects (PROP-001 Q1 resolved).
- Idempotent: re-stamping must never change created_at.
- Server does not stamp on behalf of clients for local files — the CLI does. MCP stamps pushed_at_version at push time only.
- Dirty worktree → append "-dirty" to SHA (e.g., "a3f2e91-dirty").
- Archive is immutable: updated_at freezes on move to archive/.
- Git-absent: fall back to package.json version; if both missing, "unknown" + warning.

## Decisions
All 6 questions resolved 2026-04-17 by Vibe Coder (accept all recommendations).

1. **`cleargate-cli/` scaffold** — **Resolved:** prerequisite Epic. Add **EPIC-000: CLI package scaffold** before this one. Otherwise Story 001-03 blocks everything.
2. **Who invokes `cleargate stamp`** — **Resolved:** AI agent per protocol rule (`after any Write/Edit to .cleargate/delivery/* ... call stamp`). PostToolUse hook can be added later as optimization.
3.

[+731 bytes not shown — read .cleargate/delivery/archive/EPIC-001_Document_Metadata_Lifecycle.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[STORY-001-01]], [[STORY-001-02]], [[STORY-001-03]], [[STORY-001-04]], [[STORY-001-05]], [[STORY-001-06]]
- Cited by (3): [[BUG-067]], [[BUG-097]], [[EPIC-002]]
<!-- END relations -->
