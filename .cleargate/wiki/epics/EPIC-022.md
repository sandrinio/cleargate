---
type: epic
id: "EPIC-022"
parent: ""
children: 
  - "[[STORY-022-01]]"
  - "[[STORY-022-02]]"
  - "[[STORY-022-03]]"
  - "[[STORY-022-04]]"
  - "[[STORY-022-05]]"
  - "[[STORY-022-06]]"
  - "[[STORY-022-07]]"
  - "[[STORY-022-08]]"
  - "[[STORY-099-01]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-022: Sprint Planning Lane Classifier + Hotfix Path

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add an Architect-judged lane classifier to Sprint Planning v2 that tags each story with one of {standard, fast, hotfix}; route the four-agent loop accordingly; auto-demote on failure; surface metrics and audit tables in the Sprint Report; preserve the existing four-agent contract (no DevOps role split).</objective>
  <architecture_rules>
    <rule>Pre-gate scanner is NEVER skipped, regardless of lane. Mechanical correctness is non-negotiable.</rule>
    <rule>Four-agent contract preserved. No new agent. Lane routing happens inside the existing Architect (judges) + Developer (executes lane-aware) + QA (skipped on lane=fast) + Reporter (audits) loop.</rule>
    <rule>Demotion is one-way: a story can demote `fast → standard` mid-sprint but NEVER promote `standard → fast`. Lane is decided once at Sprint Planning v2 Gate 2.</rule>
    <rule>Hotfix lane is OFF-SPRINT only. Sprint Plan stories carry `lane: standard|fast`; `hotfix` is a separate routing applied to off-sprint CR/Bug items.</rule>
    <rule>state.json schema bumps to v2.

[+23,244 bytes not shown — read .cleargate/delivery/archive/EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md]

## Blast radius
Affects: [[STORY-022-01]], [[STORY-022-02]], [[STORY-022-03]], [[STORY-022-04]], [[STORY-022-05]], [[STORY-022-06]], [[STORY-022-07]], [[STORY-022-08]], [[STORY-099-01]]
