---
type: proposal
id: "PROPOSAL-001"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-001: Automatic Document Metadata (Creation, Edit, Codebase Version)

## 1. Initiative & Context

### 1.1 Objective
Every ClearGate document — Proposal, Epic, Story, Bug, CR, Initiative, Sprint — must automatically capture and maintain three metadata fields in its YAML frontmatter:

- `created_at` — ISO-8601 timestamp of first draft
- `updated_at` — ISO-8601 timestamp of last modification
- `codebase_version` — the version/commit state of the codebase when the document was touched

This gives every work item an auditable trail tying it to a precise moment and a precise codebase state.

### 1.2 The "Why"

- **Context decay.** A Story drafted against commit `abc123` may be obsolete if the repo is now at `xyz789`. The AI needs to know when a document was written relative to code state before acting on it.
- **CR blast radius.** When a CR invalidates prior Epics/Stories, knowing each downstream item's `codebase_version` lets the AI judge whether the invalidation still holds or if the code has already moved past it.
- **Human audit.** Vibe Coders reviewing archived items need to see "drafted at v1.3.2" to evaluate whether the implementation still reflects the intent.

[+7,652 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
