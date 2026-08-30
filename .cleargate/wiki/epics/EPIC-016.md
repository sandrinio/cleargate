---
type: epic
id: "EPIC-016"
parent: ""
children: 
  - "[[STORY-016-01]]"
  - "[[STORY-016-02]]"
  - "[[STORY-016-03]]"
  - "[[STORY-016-04]]"
  - "[[STORY-016-05]]"
  - "[[STORY-016-06]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-016_Upgrade_UX.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-016: Upgrade UX — Release Notifier, CHANGELOG, Meta-Repo Dogfood

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Close the three gaps in ClearGate's versioning UX: users have no way to learn a new cleargate release exists, no changelog to read when they do upgrade, and the meta-repo itself bypasses the upgrade flow so the UX is untested in our primary development loop.</objective>
  <architecture_rules>
    <rule>Reuse the existing manifest + 3-way merge infrastructure from EPIC-009 — do NOT build a parallel upgrade path</rule>
    <rule>Registry checks must be opt-out (env var CLEARGATE_NO_UPDATE_CHECK=1) and throttled to ≤1/day to respect offline + CI environments</rule>
    <rule>CHANGELOG.md is the source of truth; upgrade output references it but does not duplicate its content inline</rule>
    <rule>No auto-upgrade — user still runs `cleargate upgrade` manually; this epic only surfaces that an upgrade is available</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/src/lib/registry-check.ts" action="create" />
    <file path="cleargate-cli/CHANGELOG.md" action="create" />
    <file

[+8,950 bytes not shown — read .cleargate/delivery/archive/EPIC-016_Upgrade_UX.md]

## Blast radius
Affects: [[STORY-016-01]], [[STORY-016-02]], [[STORY-016-03]], [[STORY-016-04]], [[STORY-016-05]], [[STORY-016-06]]
