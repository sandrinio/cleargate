---
type: proposal
id: "PROPOSAL-001"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-001: Automatic Document Metadata (Creation, Edit, Codebase Version)

**Status:** Abandoned · **Sprint:** none · **Gate:** not run

## Initiative & Context
### 1.1 Objective
Every ClearGate document — Proposal, Epic, Story, Bug, CR, Initiative, Sprint — must automatically capture and maintain three metadata fields in its YAML frontmatter:

- `created_at` — ISO-8601 timestamp of first draft
- `updated_at` — ISO-8601 timestamp of last modification
- `codebase_version` — the version/commit state of the codebase when the document was touched

[+864 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md]

## Technical Architecture & Constraints
### 2.1 Dependencies
- **Git** — for commit SHA capture (primary source when repo is a git repo)
- **package.json** — for semver fallback when git is unavailable or missing tags
- **Node.js** — runtime for the stamping utility
- **YAML parser** — in the MCP adapter, to preserve these fields on push

### 2.2 System Constraints

[+3,500 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files — must be modified

**Templates (add metadata fields to YAML frontmatter):**
- `.cleargate/templates/initiative.md`
- `.cleargate/templates/epic.md`
- `.cleargate/templates/story.md`
- `.cleargate/templates/Bug.md`
- `.cleargate/templates/CR.md`
- `.cleargate/templates/proposal.md`
- `.cleargate/templates/Sprint Plan Template.md`

**Protocol (add §11 "Document Metadata Lifecycle"):**
- `.cleargate/knowledge/cleargate-protocol.md`

[+581 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md]

## AI Interrogation Loop — RESOLVED
All decisions resolved by Vibe Coder 2026-04-17, accepting AI recommendations. One item deferred.

### Original 7 questions

1. **Schema shape** — **Resolved:** flat strings (Option B). Token economy over audit-grade fidelity.
2. **Update mechanism** — **Resolved:** stamp CLI + protocol rule (Option C). Deterministic and visible.
3. **Version capture** — **Resolved:** both. Fields: `created_at_version` + `updated_at_version`.
4.

[+1,801 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-001_Document_Metadata.md]

## Approval Gate — PASSED
Approved by Vibe Coder on 2026-04-17. AI authorized to proceed with Epic/Story decomposition for this feature. Unblocks PROPOSAL-002 (which has a declared `depends_on` on this proposal).

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
