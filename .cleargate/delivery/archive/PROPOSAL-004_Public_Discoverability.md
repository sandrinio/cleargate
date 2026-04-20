---
proposal_id: PROP-004
status: Approved
author: AI Agent (cleargate planning)
approved: true
approved_at: 2026-04-19T03:30:00Z
approved_by: Vibe Coder (ssuladze@exadel.com)
created_at: 2026-04-19T03:00:00Z
updated_at: 2026-04-19T03:30:00Z
codebase_version: post-phase-2c
depends_on: []
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:30.586Z
push_version: 3
---

# PROPOSAL-004: Public Discoverability — Repo Metadata + README Pitch

## 1. Initiative & Context

### 1.1 Objective
Make the ClearGate meta-repo discoverable to the right audience (developers searching "Claude Code agents", "AI sprint planning", "MCP framework", "Karpathy LLM wiki") via repo-name + GitHub topics + description + README first-paragraph optimization. No code changes; pure marketing surface.

### 1.2 The "Why"
- **Today the repo is invisible.** Name `ClearGate` (PascalCase, no keywords) + no description + no topics + no README pitch = zero organic search surface. SEO ranking signals GitHub + Google actually use are description (~150 chars), topics (filter pills), README first 200 chars, and stars/activity. Repo name is ~5–10% of the signal — but the OTHER signals are ~0% today.
- **Cross-package naming inconsistency.** npm package is `cleargate` (lowercase), MCP server repo is `cleargate-mcp` (kebab-case lowercase), this meta-repo is `ClearGate` (PascalCase). Lowercasing this repo to `cleargate` aligns the three product surfaces and matches npm convention. GitHub redirects old URLs — non-breaking.
- **Brand vs keyword tradeoff.** Pure brand (`ClearGate`) is distinctive but earns no keyword juice. Pure descriptive (`claude-code-planning-framework`) loses brand. Hybrid (`cleargate-planning`, `cleargate-framework`) is a mild compromise. Recommendation: **lowercase only** (`cleargate`) — keeps brand, gains consistency, costs nothing.
- **Vibe coder onboarding.** Someone who finds the repo via search needs to know in ≤200 chars: what is this, who is it for, what's the install command. The README first paragraph is that 200 chars. Today there isn't one.
- **Three-product discoverability.** ClearGate-the-product is three things (cli, mcp, planning); the meta-repo is the discoverability anchor for all three. Without it, each lives in isolation and someone lands on `cleargate-mcp` without knowing the planning framework exists.

## 2. Technical Architecture & Constraints

### 2.1 Dependencies
- GitHub repo settings access (owner-level — `sandrinio` on `sandrinio/ClearGate`).
- npm publish access for `cleargate@latest` description sync (optional — npm reads from `package.json#description`).
- No code dependencies. No build dependencies. No infra changes.

### 2.2 System Constraints

| Constraint | Detail |
|---|---|
| **Brand preserved** | "ClearGate" stays the product name in prose; only the URL slug lowercases. |
| **Non-destructive rename** | GitHub auto-redirects from `sandrinio/ClearGate` → `sandrinio/cleargate`. No existing links break. Verify via curl after rename. |
| **Description ≤ 150 chars** | GitHub truncates at ~150 in search-result snippets. Tight pitch only. |
| **Topics ≤ 20** | GitHub allows 20 tags max. Pick the ten with highest search-volume relevance. |
| **README first 200 chars carry the SEO weight** | Google's snippet preview pulls from this region. Lead with the value prop + install command. |
| **No npm rename** | npm package stays `cleargate@0.1.0-alpha.1` regardless of repo casing. Already lowercase. |
| **No mcp/admin repo renames in scope** | Those are separate-repo decisions, future proposals if needed. |

### 2.3 Recommended End State

**Repo name:** `cleargate` (lowercase, hyphen-free).

**Description (verbatim candidate, 148 chars):**
> "Planning framework for Claude Code agents — sprint/epic/story protocol, four-agent loop (architect/developer/qa/reporter), Karpathy-style awareness wiki."

**Topics (10):**
`claude-code` · `claude-agent-sdk` · `mcp` · `model-context-protocol` · `ai-agents` · `coding-agents` · `sprint-planning` · `agent-orchestration` · `karpathy-wiki` · `framework`

**README first paragraph (lead, ~3 sentences):**
> "**ClearGate** scaffolds Claude Code into a disciplined planning loop — proposals → epics → stories → sprints → execution via a four-agent team (architect / developer / qa / reporter). One command bootstraps a downstream repo: `npx cleargate init`. Includes a Karpathy-style awareness wiki so every session starts with full situational context, not blind grep."

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files
- GitHub repo settings (no file in repo) — name, description, topics, social-preview image (optional)
- `cleargate-cli/package.json` — `description` field (currently terse) → match the GitHub description for consistency
- `cleargate-cli/README.md` — npm-published README; first paragraph mirrors the GitHub README pitch

### 3.2 Expected New Entities
- `README.md` at meta-repo root — does not currently exist; needs creation. Lead paragraph as above; below the lead, a 3-section structure: "What it is" / "Quick start" / "How it works" pointing at `.cleargate/knowledge/cleargate-protocol.md` and `cleargate-planning/`.
- (Optional) `assets/social-preview.png` — 1280×640 OG image. Nice-to-have, not required for v1.

### 3.3 Decomposition Hint (post-approval)

If approved, this becomes a small Epic (likely **EPIC-007: Public Discoverability**) with ~3 stories:
1. STORY-007-01: Repo rename + GitHub description + topics (L1, ~30 min, ops + verify redirects)
2. STORY-007-02: README.md at meta-root (L1, ~1 hr, prose)
3. STORY-007-03: cleargate-cli/README + package.json description sync (L1, ~30 min, prose + bump publish notes)

Total ~2 hours of work. Could land within SPRINT-04's slack OR slot into SPRINT-05 alongside admin-UI.

## 🔒 Approval Gate

(Vibe Coder: Review this proposal. If the architecture and context are correct, change `approved: false` to `approved: true` in the YAML frontmatter. Only then is the AI authorized to proceed with Epic/Story decomposition.)
