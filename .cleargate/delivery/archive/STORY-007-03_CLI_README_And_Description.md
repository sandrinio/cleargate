---
story_id: STORY-007-03
parent_epic_ref: EPIC-007
parent_cleargate_id: "EPIC-007"
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
pushed_at: 2026-04-20T19:42:48.841Z
push_version: 3
---

# STORY-007-03: CLI README + package.json description sync

**Complexity:** L1 — prose write to one README + 1-line edit to package.json.

## 1. The Spec
Update `cleargate-cli/README.md` so its first paragraph mirrors the meta-root README pitch (cross-surface consistency: GitHub repo page and npm package page should hook the same audience). Update `cleargate-cli/package.json#description` to match the GitHub description (148-char pitch). Mention the new `cleargate wiki {build,ingest,query,lint}` commands shipped by EPIC-002.

## 2. Acceptance
```gherkin
Scenario: CLI README pitch matches root README
  When I diff first paragraph of cleargate-cli/README.md vs README.md
  Then they convey the same value prop + install command

Scenario: package.json description matches GitHub
  When I read cleargate-cli/package.json#description
  Then it equals the 148-char pitch from PROPOSAL-004 §2.3

Scenario: wiki commands documented
  When I grep cleargate-cli/README.md
  Then "wiki build", "wiki ingest", "wiki query", "wiki lint" all appear
```

## 3. Implementation
- Write to `cleargate-cli/README.md` (mirrors root pitch + adds wiki command list).
- Edit `cleargate-cli/package.json` line 6: replace description with the 148-char pitch.

## Ambiguity Gate
🟢 Low. Source pitch comes from PROPOSAL-004 §2.3.
