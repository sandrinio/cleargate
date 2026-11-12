---
type: epic
id: "EPIC-007"
parent: ""
children: 
  - "[[STORY-007-00]]"
  - "[[STORY-007-01]]"
  - "[[STORY-007-02]]"
  - "[[STORY-007-03]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-007_Public_Discoverability.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-04"
---

# EPIC-007: Public Discoverability — git push + GitHub metadata + READMEs

**Status:** Completed · **Sprint:** SPRINT-04 · **Gate:** not run

## Objective
Publish the ClearGate meta-repo to https://github.com/sandrinio/ClearGate, then optimize its discoverability surface (description + topics + README first-paragraph) per PROPOSAL-004's recommended end state. No code changes; pure marketing + ops.

## Problem & Value
ClearGate is a working planning framework today (SPRINT-04 just shipped EPIC-002 wiki end-to-end), but the meta-repo has zero public surface. There is no `git remote`, no GitHub repo, no description, no topics, no README. Search-discoverability is zero; even teammates can't `git clone` without out-of-band file transfer. This Epic publishes the meta-repo and dresses it for the search audiences PROPOSAL-004 identified ("Claude Code agents", "AI sprint planning", "MCP framework", "Karpathy LLM wiki").

[+628 bytes not shown — read .cleargate/delivery/archive/EPIC-007_Public_Discoverability.md]

## Scope
**In:**
- Initial git remote setup + first push (STORY-007-00)
- GitHub repo rename `ClearGate` → `cleargate` + description + topics (STORY-007-01)
- New `README.md` at meta-repo root with the lead pitch (STORY-007-02)
- Sync `cleargate-cli/README.md` + `cleargate-cli/package.json` description (STORY-007-03)
**Out:**
- Social-preview OG image (1280×640) — nice-to-have, defer
- mcp/ repo metadata polish — separate proposal if needed
- Reciprocal cross-links between ClearGate ↔ mcp/ ↔ admin/ READMEs — wait until admin ships
- npm publish of `cleargate@0.1.0-alpha.2` — that's SPRINT-04 Ops carryover, not this epic
- GitHub Actions / CI setup — out of scope; vibe coder runs tests locally

## Architecture rules
- Repo name lowercased to `cleargate` (PR-004 §2.3) — but only AFTER initial push. STORY-007-00 pushes to `sandrinio/ClearGate` (current PascalCase URL); STORY-007-01 renames to lowercase + GitHub auto-redirects old URL.
- No code changes in any story — text + git/GitHub config only.
- Brand-name "ClearGate" stays in prose; only URL slug + package metadata lowercase.
- STORY-007-00 must complete before STORY-007-01/02/03 (initial push is prerequisite for any GitHub-side action).
- knowledge/ (gitignored) stays private; mcp/ (separate repo) not part of this push.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-007-00]], [[STORY-007-01]], [[STORY-007-02]], [[STORY-007-03]]
<!-- END relations -->
