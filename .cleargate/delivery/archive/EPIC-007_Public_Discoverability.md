---
epic_id: "EPIC-007"
parent_proposal_ref: "PROPOSAL-004"
status: "Completed"
ambiguity: "🟢 Low"
context_source: "PROPOSAL-004_Public_Discoverability.md"
owner: "Vibe Coder (ssuladze@exadel.com)"
target_date: "2026-04-19"
created_at: "2026-04-19T15:00:00Z"
updated_at: "2026-04-19T15:00:00Z"
completed_at: "2026-04-19T11:17:35Z"
completed_in_sprint: "ad-hoc post-SPRINT-04"
created_at_version: "post-SPRINT-04"
updated_at_version: "post-SPRINT-04"
resolved_at: "2026-04-19T15:00:00Z"
resolved_by: "Vibe Coder (ssuladze@exadel.com)"
---

# EPIC-007: Public Discoverability — git push + GitHub metadata + READMEs

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Publish the ClearGate meta-repo to https://github.com/sandrinio/ClearGate, then optimize its discoverability surface (description + topics + README first-paragraph) per PROPOSAL-004's recommended end state. No code changes; pure marketing + ops.</objective>
  <architecture_rules>
    <rule>Repo name lowercased to `cleargate` (PR-004 §2.3) — but only AFTER initial push. STORY-007-00 pushes to `sandrinio/ClearGate` (current PascalCase URL); STORY-007-01 renames to lowercase + GitHub auto-redirects old URL.</rule>
    <rule>No code changes in any story — text + git/GitHub config only.</rule>
    <rule>Brand-name "ClearGate" stays in prose; only URL slug + package metadata lowercase.</rule>
    <rule>STORY-007-00 must complete before STORY-007-01/02/03 (initial push is prerequisite for any GitHub-side action).</rule>
    <rule>knowledge/ (gitignored) stays private; mcp/ (separate repo) not part of this push.</rule>
  </architecture_rules>
  <target_files>
    <file path="(git remote setup)" action="configure" />
    <file path="README.md" action="create" />
    <file path="cleargate-cli/README.md" action="modify" />
    <file path="cleargate-cli/package.json" action="modify" />
    <file path="(GitHub repo settings)" action="configure" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

ClearGate is a working planning framework today (SPRINT-04 just shipped EPIC-002 wiki end-to-end), but the meta-repo has zero public surface. There is no `git remote`, no GitHub repo, no description, no topics, no README. Search-discoverability is zero; even teammates can't `git clone` without out-of-band file transfer. This Epic publishes the meta-repo and dresses it for the search audiences PROPOSAL-004 identified ("Claude Code agents", "AI sprint planning", "MCP framework", "Karpathy LLM wiki").

**Success Metrics:**
- `git push origin main` from this machine succeeds; `git@github.com:sandrinio/cleargate.git` (post-rename) reflects the full local main history.
- Anyone running `git clone https://github.com/sandrinio/cleargate` gets a working ClearGate framework copy.
- GitHub search for "claude code planning framework" surfaces the repo within 7 days (organic indexing).
- Repo's GitHub page shows: tight description (≤150 chars), 10 topics, README first paragraph hooks the right audience in ≤200 chars.
- npm `cleargate` package's README + description match the GitHub README pitch (cross-surface consistency).

## 2. Scope Boundaries

**✅ IN-SCOPE**
- Initial git remote setup + first push (STORY-007-00)
- GitHub repo rename `ClearGate` → `cleargate` + description + topics (STORY-007-01)
- New `README.md` at meta-repo root with the lead pitch (STORY-007-02)
- Sync `cleargate-cli/README.md` + `cleargate-cli/package.json` description (STORY-007-03)

**❌ OUT-OF-SCOPE (deferred)**
- Social-preview OG image (1280×640) — nice-to-have, defer
- mcp/ repo metadata polish — separate proposal if needed
- Reciprocal cross-links between ClearGate ↔ mcp/ ↔ admin/ READMEs — wait until admin ships
- npm publish of `cleargate@0.1.0-alpha.2` — that's SPRINT-04 Ops carryover, not this epic
- GitHub Actions / CI setup — out of scope; vibe coder runs tests locally

## 3. Acceptance Criteria

```gherkin
Feature: Public Discoverability

  Scenario: Initial git push succeeds
    Given the meta-repo has no remote configured
    When I run `git remote add origin <URL>` and `git push -u origin main`
    Then the GitHub repo at sandrinio/cleargate (or sandrinio/ClearGate pre-rename) reflects all commits
    And `git rev-parse origin/main` matches local HEAD

  Scenario: GitHub-side metadata applied
    Given the repo is pushed
    When I view github.com/sandrinio/cleargate
    Then the description matches PROPOSAL-004 §2.3 (148-char pitch)
    And the topics list contains all 10 tags from PROPOSAL-004 §2.3
    And the URL `github.com/sandrinio/ClearGate` redirects to lowercase

  Scenario: README leads with the right pitch
    Given a user lands on the GitHub repo page
    When they read the rendered README first 200 chars
    Then they see the value prop ("planning framework for Claude Code agents")
    And the install command (`npx cleargate init`)
    And a hook into the four-agent loop concept

  Scenario: CLI README mirrors GitHub README pitch
    Given `cleargate-cli/README.md` and meta-root `README.md`
    When I diff their first paragraphs
    Then the value prop and install command are byte-identical (intent: consistency on npm vs GitHub)
```

## 4. Stories

- **STORY-007-00** — Git remote add + initial push to `sandrinio/ClearGate` (L1, ~10 min, blocks 01–03)
- **STORY-007-01** — GitHub repo rename + description + topics via gh CLI / web UI (L1, ~20 min, after 00)
- **STORY-007-02** — Create `README.md` at meta-repo root with PROPOSAL-004 §2.3 lead paragraph (L1, ~1 hr, parallel with 03 after 00)
- **STORY-007-03** — Sync `cleargate-cli/README.md` + `package.json#description` (L1, ~30 min, parallel with 02 after 00)

**Total: 4 stories, all L1. ~2 hours.**

## 5. Dependencies

- PROPOSAL-004 approved ✓ (commit `ed8a5a9`).
- GitHub repo `sandrinio/ClearGate` either exists or is created at STORY-007-00 dispatch time.
- User has SSH key / HTTPS credentials configured for `github.com:sandrinio`.
- No code dependencies. No infra. No new npm deps.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY**

- [x] PROPOSAL-004 approved.
- [x] PROPOSAL-004 §2.3 specifies the exact description + topics + README lead text.
- [x] No conflicting open §6 questions at the Epic level (story-level questions live in each story file).
- [x] Cross-story ordering explicit (00 → 01/02/03).
- [x] Scope boundary tight (no code changes; no admin/mcp polish).
