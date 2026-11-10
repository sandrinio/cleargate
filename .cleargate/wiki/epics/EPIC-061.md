---
type: epic
id: "EPIC-061"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-061_cli_repo_hygiene_and_layout.md"
last_ingest: "2026-11-07T17:40:27.412Z"
last_ingest_commit: ""
repo: "planning"
---

# EPIC-061: cleargate-cli Hygiene, Layout & Public Release

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Restructure cleargate-cli so its layout follows its domains and its working tree holds only source, and its docs and metadata are accurate. Then ship it the way the owner wants: npm carries only the installer, runtime and one copy of the installed payload, and the factory's source becomes the public GitHub repo sandrinio/cleargate. No command changes behaviour, and no host's installed result changes.</objective>
  <architecture_rules>
    <rule>Zero behaviour change. For every story, typecheck is clean and the full `npm test` adds no failing test beyond the failure list recorded at the epic's base commit (§3 Test ratchet).</rule>
    <rule>Payload identity. S1–S4 keep `templates/cleargate-planning/**` byte-identical to the epic's base commit. S10 removes that flat copy. From S10 on, the identity check is the tree that `init --host claude`, `--host codex` and `--host all` produce in a scratch repo, which must match the pre-S10 baseline.</rule>
    <rule>No moves inside `scaffold/**`.

[+26,039 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-061_cli_repo_hygiene_and_layout.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
