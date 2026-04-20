---
story_id: STORY-007-02
parent_epic_ref: EPIC-007
status: Completed
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-004_Public_Discoverability.md
created_at: 2026-04-19T15:45:00Z
updated_at: 2026-04-19T15:45:00Z
shipped_commit: c326e77daf35cb232d7bac4950ae1384a42809ae
completed_at: 2026-04-19T11:17:19Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:18.828Z
push_version: 3
---

# STORY-007-02: Root README — proper pitch + 3 sections

**Complexity:** L1 — prose write to one file.

## 1. The Spec
Replace the GitHub-stub `# ClearGate\n` README at the meta-repo root with PROPOSAL-004 §2.3's lead paragraph + the 3-section structure named in §3.2: "What it is" / "Quick start" / "How it works" pointing at `.cleargate/knowledge/cleargate-protocol.md` and `cleargate-planning/`.

## 2. Acceptance
```gherkin
Scenario: README pitches in ≤200 chars
  When I read the first paragraph of README.md
  Then it contains "Planning framework", "Claude Code", "four-agent", and "npx cleargate init"

Scenario: 3-section structure present
  When I grep README.md for "## What it is", "## Quick start", "## How it works"
  Then all three headers appear

Scenario: Pointers resolve
  When I follow links in "How it works"
  Then they point at .cleargate/knowledge/cleargate-protocol.md and cleargate-planning/
```

## 3. Implementation
Single Write to `README.md` at meta-repo root.

## Ambiguity Gate
🟢 Low. Lead paragraph + section structure specified in PROPOSAL-004 §2.3 + §3.2.
