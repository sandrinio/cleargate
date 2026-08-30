---
type: proposal
id: "PROPOSAL-004"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-004_Public_Discoverability.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-004: Public Discoverability — Repo Metadata + README Pitch

## 1. Initiative & Context

### 1.1 Objective
Make the ClearGate meta-repo discoverable to the right audience (developers searching "Claude Code agents", "AI sprint planning", "MCP framework", "Karpathy LLM wiki") via repo-name + GitHub topics + description + README first-paragraph optimization. No code changes; pure marketing surface.

### 1.2 The "Why"
- **Today the repo is invisible.** Name `ClearGate` (PascalCase, no keywords) + no description + no topics + no README pitch = zero organic search surface. SEO ranking signals GitHub + Google actually use are description (~150 chars), topics (filter pills), README first 200 chars, and stars/activity. Repo name is ~5–10% of the signal — but the OTHER signals are ~0% today.
- **Cross-package naming inconsistency.** npm package is `cleargate` (lowercase), MCP server repo is `cleargate-mcp` (kebab-case lowercase), this meta-repo is `ClearGate` (PascalCase). Lowercasing this repo to `cleargate` aligns the three product surfaces and matches npm convention. GitHub redirects old URLs — non-breaking.
- **Brand vs keyword tradeoff.** Pure brand (`ClearGate`) is distinctive but earns no keyword juice.

[+4,467 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-004_Public_Discoverability.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
