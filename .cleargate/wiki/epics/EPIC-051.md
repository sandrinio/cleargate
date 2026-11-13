---
type: epic
id: "EPIC-051"
parent: ""
children: 
  - "[[STORY-051-01]]"
  - "[[STORY-051-02]]"
  - "[[STORY-051-03]]"
  - "[[STORY-051-04]]"
  - "[[STORY-051-05]]"
  - "[[STORY-051-06]]"
  - "[[STORY-051-07]]"
  - "[[STORY-051-08]]"
  - "[[STORY-051-09]]"
cites: []
cited_by: 
  - "[[STORY-051-07]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e5444d52a21b1661b98f32112a6b97573dde56b6"
repo: "planning"
---

# EPIC-051: Enforcement Integrity Restoration (post-CR-074)

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Close the gap between "documented as enforced" and "actually enforced" that CR-070/CR-074's execution_mode retirement opened: restore the pre-commit gates that silently went advisory, purge dead v1/v2 vocabulary, and add a guard so canonical→live/payload drift cannot recur.

## Problem & Value
**Why are we doing this?**
A 2026-07-17 six-lens self-audit (53 agents, 46 verified findings, 0 refuted) found that CR-070/CR-074 retired the `execution_mode`/v1/v2 axis in code but left the enforcement layer half-wired: multiple pre-commit gates the docs call **"Always enforced"** now silently do nothing, dead v1/v2 vocabulary litters ~15 shipping surfaces (including a root `CLAUDE.md` paragraph that routes

[+998 bytes not shown — read .cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md]

## Scope
**In:**
- [ ] Restore the file-surface pre-commit gate to unconditional blocking (drop the retired-`execution_mode` code path; keep `SKIP_SURFACE_GATE=1` / `CLEARGATE_ADVISORY=1` as the only bypass).
**Out:**
- Reintroducing any execution-topology or enforcement-strength axis beyond `CLEARGATE_ADVISORY`.
- Changing the five-agent execution loop, the `/workflows` wave path, or `launch_wave` behavior (CR-074

[+1,303 bytes not shown — read .cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md]

## Architecture rules
- CLEARGATE_ADVISORY=1 is the ONLY sanctioned enforcement-strength lever post-CR-074; do not reintroduce execution_mode / v1 / v2 / CLEARGATE_PARALLEL_WAVES / CLEARGATE_EXEC_MODE as behavior switches.
- Every canonical edit under cleargate-planning/** must be mirrored to the npm payload via `npm run prebuild` and hand-synced to the live /.claude|/.cleargate copies (dogfood split — see CLAUDE.md).

[+212 bytes not shown — read .cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md]

## Decisions
*(All eight decisions were answered by the owner at Gate-1 review and integrated into the story scope below. No open questions remain.)*

- **Q1 → NARROW.** `CLEARGATE_ADVISORY=1` is NOT universal; §15 is narrowed to its true scope (`cleargate sprint preflight` + the `cleargate sprint init` story-file assertion) and disclaims all other gates.

[+1,270 bytes not shown — read .cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (9): [[STORY-051-01]], [[STORY-051-02]], [[STORY-051-03]], [[STORY-051-04]], [[STORY-051-05]], [[STORY-051-06]], [[STORY-051-07]], [[STORY-051-08]], [[STORY-051-09]]
- Cited by (1): [[STORY-051-07]]
<!-- END relations -->
