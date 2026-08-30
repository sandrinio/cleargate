---
type: epic
id: "EPIC-009"
parent: ""
children: 
  - "[[STORY-009-01]]"
  - "[[STORY-009-02]]"
  - "[[STORY-009-03]]"
  - "[[STORY-009-04]]"
  - "[[STORY-009-05]]"
  - "[[STORY-009-06]]"
  - "[[STORY-009-07]]"
  - "[[STORY-009-08]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-009: Scaffold Manifest + Drift Detection + `cleargate uninstall`

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Give ClearGate a deterministic scaffold lifecycle. Ship (1) build-time MANIFEST.json declaring every file `cleargate init` installs (SHA256 + tier + policies); (2) `.install-manifest.json` snapshot written at init time; (3) `cleargate doctor --check-scaffold` for drift classification; (4) `cleargate upgrade` with three-way merge on `prompt-on-drift`; (5) `cleargate uninstall` with preservation categories, safety rails, and `.uninstalled` marker for future restore; (6) auto-generated CHANGELOG diff block at release time.</objective>
  <architecture_rules>
    <rule>Manifest is built at npm run build, shipped with the package — never computed at install time (PROP-006 Q1).</rule>
    <rule>File identifier is SHA256 over normalized content (LF, UTF-8, no-BOM, trailing-newline enforced) — no git dependency (PROP-006 Q2).</rule>
    <rule>Three surfaces compared pairwise: package manifest (shipped), install snapshot (.install-manifest.json), current state (live FS). 4 drift states per PROP-006 §2.4.</rule>
    <rule>Agent never auto-overwrites on upstream-changed drift.

[+17,047 bytes not shown — read .cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md]

## Blast radius
Affects: [[STORY-009-01]], [[STORY-009-02]], [[STORY-009-03]], [[STORY-009-04]], [[STORY-009-05]], [[STORY-009-06]], [[STORY-009-07]], [[STORY-009-08]]
