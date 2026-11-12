---
type: proposal
id: "PROPOSAL-004"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-004_Public_Discoverability.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-004: Public Discoverability — Repo Metadata + README Pitch

**Status:** Abandoned · **Sprint:** none · **Gate:** not run

## Initiative & Context
### 1.1 Objective
Make the ClearGate meta-repo discoverable to the right audience (developers searching "Claude Code agents", "AI sprint planning", "MCP framework", "Karpathy LLM wiki") via repo-name + GitHub topics + description + README first-paragraph optimization. No code changes; pure marketing surface.

### 1.2 The "Why"
- **Today the repo is invisible.** Name `ClearGate` (PascalCase, no keywords) + no description + no topics + no README pitch = zero organic search surface. SEO ranking signals GitHub + Google actually use are description (~150 chars), topics (filter pills), README first 200 chars, and stars/activity.

[+1,246 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-004_Public_Discoverability.md]

## Technical Architecture & Constraints
### 2.1 Dependencies
- GitHub repo settings access (owner-level — `sandrinio` on `sandrinio/ClearGate`).
- npm publish access for `cleargate@latest` description sync (optional — npm reads from `package.json#description`).
- No code dependencies. No build dependencies. No infra changes.

### 2.2 System Constraints

| Constraint | Detail |
|---|---|
| **Brand preserved** | "ClearGate" stays the product name in prose; only the URL slug lowercases. |

[+1,131 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-004_Public_Discoverability.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files
- GitHub repo settings (no file in repo) — name, description, topics, social-preview image (optional)
- `cleargate-cli/package.json` — `description` field (currently terse) → match the GitHub description for consistency
- `cleargate-cli/README.md` — npm-published README; first paragraph mirrors the GitHub README pitch

[+922 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-004_Public_Discoverability.md]

## 🔒 Approval Gate
(Vibe Coder: Review this proposal. If the architecture and context are correct, change `approved: false` to `approved: true` in the YAML frontmatter. Only then is the AI authorized to proceed with Epic/Story decomposition.)

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
