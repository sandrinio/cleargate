---
type: proposal
id: "PROPOSAL-074"
parent: ""
children: []
cites: 
  - "[[EPIC-013]]"
  - "[[EPIC-018]]"
  - "[[EPIC-027]]"
cited_by: 
  - "[[EPIC-058]]"
  - "[[EPIC-061]]"
  - "[[SPRINT-41]]"
  - "[[STORY-058-01]]"
  - "[[STORY-058-02]]"
  - "[[STORY-058-03]]"
  - "[[STORY-058-04]]"
  - "[[STORY-058-05]]"
  - "[[STORY-058-06]]"
  - "[[STORY-058-07]]"
  - "[[STORY-058-08]]"
  - "[[STORY-058-09]]"
  - "[[STORY-058-10]]"
  - "[[STORY-058-11]]"
  - "[[STORY-058-12]]"
  - "[[STORY-058-13]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "9c391f2be41469898f0ee5620fffbf8042a5ba28"
repo: "planning"
---

# PROPOSAL-074: EPIC-074: Antigravity 2.0 Host Port — Full-Parity Scaffold

**Status:** Draft · **Sprint:** none · **Gate:** fail: parent-approved, reuse-audit-recorded, simplest-form-justified

## Problem & Value
**Why are we doing this?**
ClearGate's planning surface is host-agnostic, but its *execution* surface is Claude Code-native — `.claude/agents/`, `.claude/skills/`,

[+1,269 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## Scope Boundaries
**✅ IN-SCOPE (Build This)**
- [ ] `HostAdapter` interface + two concrete implementations (`hosts/claude/`, `hosts/antigravity/`) in `cleargate-cli/src/hosts/`.

[+3,175 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## The Reality Check (Context)
| Constraint Type | Limit / Rule |
|---|---|

[+2,172 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## Existing Surfaces
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:54` — `SKIP_FILES` set + bounded-block CLAUDE.md injection. **Coverage of this epic's scope:** ~50% extension.

[+2,449 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## Why not simpler?
- **Smallest existing surface that could carry this epic:** None — net-new abstraction required.

[+1,514 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## Technical Grounding (The "Shadow Spec")
*(Provisional. Items keyed to §6 unknowns are marked schema-pending and will be definitized when those questions close.)*

[+3,867 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## Acceptance Criteria
```gherkin
Feature: Antigravity 2.0 Host Port

  Scenario: Fresh target repo, explicit host flag (Antigravity)
    Given a fresh empty directory with git initialized
```

[+3,985 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## AI Interrogation Loop (Human Input Required)
*Web research 2026-05-22 resolved Q1–Q6 from the prior revision. Findings folded into §0/§2/§3.5/§4. Remaining unknowns below.*

[+4,921 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.

[+984 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (3): [[EPIC-013]], [[EPIC-018]], [[EPIC-027]]
- Cited by (16): [[EPIC-058]], [[EPIC-061]], [[SPRINT-41]], [[STORY-058-01]], [[STORY-058-02]], [[STORY-058-03]], [[STORY-058-04]], [[STORY-058-05]], [[STORY-058-06]], [[STORY-058-07]], [[STORY-058-08]], [[STORY-058-09]], [[STORY-058-10]], [[STORY-058-11]], [[STORY-058-12]], [[STORY-058-13]]
<!-- END relations -->
