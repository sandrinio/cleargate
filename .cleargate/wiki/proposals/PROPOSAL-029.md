---
type: proposal
id: "PROPOSAL-029"
parent: ""
children: []
cites: []
cited_by: []
status: "Ready"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
sprint_cleargate_id: "SPRINT-29"
---

# PROPOSAL-029: EPIC-029: Delivery Folder Umbrella Restructure

**Status:** Ready · **Sprint:** SPRINT-29 · **Gate:** fail: parent-approved, reuse-audit-recorded, simplest-form-justified

## Problem & Value
**Why are we doing this?**
With 27 items in `pending-sync/` and 302 in `archive/`, both humans and agents flat-scan a list

[+2,183 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Scope Boundaries
**✅ IN-SCOPE (Build This)**
- [ ] New folder layout: `active/<umbrella>/` + `archive/<umbrella>/` + transient

[+2,719 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## The Reality Check (Context)
| Constraint Type | Limit / Rule |
|---|---|

[+1,889 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Existing Surfaces
- **Surface:** `cleargate-cli/src/commands/push.ts:373` — `pendingSync = path.join(projectRoot, '.cleargate', 'delivery',

[+3,003 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Why not simpler?
- **Smallest existing surface that could carry this epic:** None.

[+2,150 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Technical Grounding (The "Shadow Spec")
**Affected Files:**
- `cleargate-cli/src/lib/umbrella-path.ts` (new) — pure resolver:

[+3,669 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Acceptance Criteria
```gherkin
Feature: Delivery Folder Umbrella Restructure

  Scenario: Discover all children of an epic with one
```

[+4,060 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## AI Interrogation Loop (Resolved 2026-05-18)
All six open questions resolved by user via AskUserQuestion 2026-05-18.

[+1,521 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Story Decomposition (preview — final IDs assigned at SPRINT-29 Prepare phase)
| Story | Title | Complexity | Parallel-Eligible |

[+848 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for SPRINT-29 SDR**

[+1,635 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
