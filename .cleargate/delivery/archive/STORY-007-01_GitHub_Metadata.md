---
story_id: "STORY-007-01"
parent_epic_ref: "EPIC-007"
status: "Completed"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-004_Public_Discoverability.md"
created_at: "2026-04-19T15:30:00Z"
updated_at: "2026-04-19T15:30:00Z"
shipped_commit: "ce1467d24fcc98a90124328f01d7988c24bb16ff"
completed_at: "2026-04-19T11:14:13Z"
created_at_version: "post-SPRINT-04"
updated_at_version: "post-SPRINT-04"
---

# STORY-007-01: GitHub Metadata — repo rename + description + topics

**Complexity:** L1 — three `gh` CLI commands.

## 1. The Spec
Apply PROPOSAL-004 §2.3 recommended end state via `gh` CLI:
1. Rename `sandrinio/ClearGate` → `sandrinio/cleargate` (lowercase). GitHub auto-redirects old URLs.
2. Set description: `"Planning framework for Claude Code agents — sprint/epic/story protocol, four-agent loop (architect/developer/qa/reporter), Karpathy-style awareness wiki."` (148 chars)
3. Add topics: `claude-code, claude-agent-sdk, mcp, model-context-protocol, ai-agents, coding-agents, sprint-planning, agent-orchestration, karpathy-wiki, framework` (10 topics).
4. Update local `git remote set-url origin git@github.com:sandrinio/cleargate.git` so future pushes don't rely on the redirect.

## 2. Acceptance
```gherkin
Scenario: Repo renamed to lowercase
  When I run `gh repo view sandrinio/cleargate --json name,visibility`
  Then name is "cleargate" and visibility is "PUBLIC"
  And visiting https://github.com/sandrinio/ClearGate redirects to .../cleargate

Scenario: Description matches PROPOSAL-004
  When I run `gh repo view sandrinio/cleargate --json description`
  Then description is the 148-char pitch from PROPOSAL-004 §2.3

Scenario: Topics are all 10
  When I run `gh repo view sandrinio/cleargate --json repositoryTopics`
  Then 10 topics are present matching PROPOSAL-004 §2.3 list

Scenario: Local remote follows the rename
  When I run `git remote -v`
  Then origin URLs end with sandrinio/cleargate.git (not ClearGate.git)
```

## 3. Implementation
```bash
gh repo rename cleargate -R sandrinio/ClearGate --yes
gh repo edit sandrinio/cleargate --description "Planning framework for Claude Code agents — sprint/epic/story protocol, four-agent loop (architect/developer/qa/reporter), Karpathy-style awareness wiki."
gh repo edit sandrinio/cleargate --add-topic claude-code,claude-agent-sdk,mcp,model-context-protocol,ai-agents,coding-agents,sprint-planning,agent-orchestration,karpathy-wiki,framework
git remote set-url origin git@github.com:sandrinio/cleargate.git
```

## 4. Quality Gates
- `gh repo view sandrinio/cleargate --json name,description,repositoryTopics` — all values match.
- `git remote -v` — both fetch + push URLs lowercased.
- `git pull --ff-only` — works (proves remote URL still resolves).

## Ambiguity Gate
🟢 Low. Every value comes from PROPOSAL-004 §2.3 verbatim. No questions for human.
