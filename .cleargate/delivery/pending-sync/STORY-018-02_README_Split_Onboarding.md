---
story_id: STORY-018-02
parent_epic_ref: EPIC-018
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-018_Framework_Universality_Public_Ship.md
actor: Stranger visiting the repo for the first time
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T19:51:44Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-018-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T19:51:44Z
  sessions: []
---

# STORY-018-02: README Split + Stranger-Onboarding Walkthrough
**Complexity:** L2 — documentation refactor with concrete onboarding flow. Two files touched plus archived content move.

**Depends on:** STORY-018-01 (README references LICENSE).

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer who has never seen ClearGate and just landed on the GitHub page, I want the README to tell me in ≤ 5 minutes what ClearGate is, why I'd use it, and how to install it into my own repo with a first-try-works walkthrough, so that I can evaluate adoption without reading 200 lines of dogfood narrative first.

### 1.2 Detailed Requirements
- New `README.md` at repo root (replacing current content):
  - **First line headline** (< 80 chars): "ClearGate — Planning framework for Claude Code agents."
  - **What it is** (2–3 sentences): the four-agent loop + template protocol + awareness wiki, distilled.
  - **Why it exists** (1 paragraph): the vibe-coder problem it solves — keeping AI coding agents disciplined across a multi-sprint product.
  - **Install** (numbered, copy-pasteable): `npm i -D cleargate` → `npx cleargate init` → verify with `npx cleargate doctor`.
  - **Getting started** (numbered, ≤ 10 min walkthrough): file a proposal → approve it → decompose to epic → invoke the Architect subagent. Use neutral placeholder language (no `npm test` / stack specifics).
  - **Link out** to `docs/INTERNALS.md` for architecture and dogfooding details.
  - **Link out** to `LICENSE` (MIT).
  - Node version requirement (≥ 24 LTS) explicit.
- New `docs/INTERNALS.md`:
  - All current README content (repo layout, dogfood explanation, four-agent contract detail, stack versions) moves here verbatim.
  - Add one lead paragraph: "This document describes how the ClearGate repo is organized and how we dogfood the framework against itself. If you're here to use ClearGate in your own project, start with README.md instead."
- Tone: functional, not cultish. Matches EPIC-018 §6 Q5 default.
- Stranger fixture — the walkthrough's literal commands must succeed when run in a blank Node repo initialized with just `npm init -y` (this is verified by STORY-018-05's integration test).

### 1.3 Out of Scope
- CONTRIBUTING.md (separate concern; add later if the project attracts external PRs).
- Marketing copy, pitch deck, logo.
- Video / screencast content.
- Internationalization of README (English only).
- Moving documentation into a docs/ site generator (mkdocs, docusaurus) — plain markdown is fine.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: README Onboarding

  Scenario: README is stranger-first
    Given a fresh clone
    When I read README.md linearly
    Then the first 100 lines introduce ClearGate and get me to a working install
    And the word "dogfood" does not appear in those first 100 lines

  Scenario: INTERNALS preserves architectural detail
    Given docs/INTERNALS.md exists
    When I read it
    Then it contains the repo layout table + four-agent contract + stack versions
    And the intro paragraph directs new users to README.md instead

  Scenario: Install instructions are copy-pasteable
    Given a stranger runs the README's install block verbatim in a blank directory containing only `package.json` from `npm init -y`
    When they run step 1 (npm i), step 2 (cleargate init), step 3 (cleargate doctor)
    Then all three commands exit 0
    And the resulting tree contains .cleargate/, .claude/, CLAUDE.md

  Scenario: Getting-started walkthrough is accurate
    Given the stranger-install scaffold is in place
    When the user follows README Getting Started steps
    Then a Draft proposal file lands in .cleargate/delivery/pending-sync/
    And the Architect subagent is invocable via Claude Code

  Scenario: README links to LICENSE and INTERNALS
    Given README.md
    When I grep for markdown links
    Then `[LICENSE](./LICENSE)` and `[docs/INTERNALS.md](./docs/INTERNALS.md)` both appear
```

### 2.2 Verification Steps (Manual)
- [ ] Read new README as a stranger — does the "first 5 min" goal land?
- [ ] Follow install steps verbatim in a blank tmpdir; verify all three commands succeed.
- [ ] `grep -c dogfood README.md | head -1` → 0 or 1 (meta mentions allowed; narrative should not center it).
- [ ] All internal markdown links resolve.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `README.md` (rewrite) |
| Related Files | `docs/INTERNALS.md` (new), `LICENSE` (reference), `cleargate-cli/package.json` (cross-check Node engine), `CLAUDE.md` (cross-reference stays accurate) |
| New Files Needed | Yes — `docs/INTERNALS.md` |

### 3.2 Technical Logic
- Preserve current README content verbatim in `docs/INTERNALS.md` to avoid information loss (we want the dogfood story available to contributors).
- New README uses the "What / Why / Install / First 10 min / Deeper dive" skeleton.
- Keep the README ≤ 300 lines; prose over tables for the onboarding section.
- Install block uses `npx cleargate init` to avoid global install requirement.
- Stack-specific language (Node, npm) is fine IN THE README — ClearGate's CLI is Node-delivered. What the README should NOT do is imply the *downstream user's* project must be Node.

### 3.3 API Contract
N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Documentation |
| Integration | 1 | STORY-018-05's foreign-repo test will run the README install commands literally against a minimal Node fixture and assert they succeed |

### 4.2 Definition of Done
- [ ] New README.md < 300 lines, stranger-onboarding structure.
- [ ] docs/INTERNALS.md has current README content + intro pointer to README.
- [ ] All cross-links resolve.
- [ ] Manual stranger-install walkthrough in a tmpdir succeeds.
- [ ] Commit: `feat(EPIC-018): STORY-018-02 README split + stranger onboarding`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] EPIC-018 §6 Q5 answer (tone) confirmed — drives opening-sentence wording.
- [ ] Confirm README.md should assume Claude Code familiarity or introduce it briefly.
