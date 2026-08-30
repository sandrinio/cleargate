---
type: epic
id: "EPIC-007"
parent: ""
children: 
  - "[[STORY-007-00]]"
  - "[[STORY-007-01]]"
  - "[[STORY-007-02]]"
  - "[[STORY-007-03]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-007_Public_Discoverability.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
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

[+4,670 bytes not shown — read .cleargate/delivery/archive/EPIC-007_Public_Discoverability.md]

## Blast radius
Affects: [[STORY-007-00]], [[STORY-007-01]], [[STORY-007-02]], [[STORY-007-03]]
