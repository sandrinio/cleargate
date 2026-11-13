---
type: epic
id: "EPIC-009"
parent: ""
children: 
  - "[[BUG-003]]"
  - "[[BUG-006]]"
  - "[[BUG-009]]"
  - "[[CR-009]]"
  - "[[CR-088]]"
  - "[[CR-089]]"
  - "[[CR-090]]"
  - "[[CR-092]]"
  - "[[STORY-009-01]]"
  - "[[STORY-009-02]]"
  - "[[STORY-009-03]]"
  - "[[STORY-009-04]]"
  - "[[STORY-009-05]]"
  - "[[STORY-009-06]]"
  - "[[STORY-009-07]]"
  - "[[STORY-009-08]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-009: Scaffold Manifest + Drift Detection + `cleargate uninstall`

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Give ClearGate a deterministic scaffold lifecycle. Ship (1) build-time MANIFEST.json declaring every file `cleargate init` installs (SHA256 + tier + policies); (2) `.install-manifest.json` snapshot written at init time; (3) `cleargate doctor --check-scaffold` for drift classification; (4) `cleargate upgrade` with three-way merge on `prompt-on-drift`; (5) `cleargate uninstall` with preservation categories, safety

[+110 bytes not shown — read .cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md]

## Problem & Value
**Why are we doing this?**
Today there is no authoritative list of what `cleargate init` installs — if a user edits `cleargate-protocol.md` to add project-specific rules, a future `cleargate upgrade` cannot know whether to overwrite the file (loses user work) or skip it (user never sees the new upstream rules).

[+1,236 bytes not shown — read .cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md]

## Scope
**In:**
- [ ] `sha256.ts` — normalized-content hasher (LF, UTF-8 no-BOM, trailing-newline enforced). Pure function; no deps beyond node:crypto.
**Out:**
- Remote manifest verification / signed manifests / supply-chain attestation (v1.1).
- Automatic `cleargate upgrade` (always human-initiated in v1).

[+2,323 bytes not shown — read .cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md]

## Architecture rules
- Manifest is built at npm run build, shipped with the package — never computed at install time (PROP-006 Q1).
- File identifier is SHA256 over normalized content (LF, UTF-8, no-BOM, trailing-newline enforced) — no git dependency (PROP-006 Q2).
- Three surfaces compared pairwise: package manifest (shipped), install snapshot (.install-manifest.json), current state (live FS).

[+1,387 bytes not shown — read .cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md]

## Decisions
All 6 questions resolved 2026-04-19 by Vibe Coder (accept all AI recommendations).

1. **Protocol section number** — **Resolved:** EPIC-009 takes §13. Chronological: EPIC-001 §11, EPIC-008 §12, EPIC-009 §13.
2. **`cleargate doctor` ownership** — **Resolved:** shared command surface. First-to-ship creates base; second extends. Consistent with EPIC-008 Q2.
3.

[+1,072 bytes not shown — read .cleargate/delivery/archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (16): [[BUG-003]], [[BUG-006]], [[BUG-009]], [[CR-009]], [[CR-088]], [[CR-089]], [[CR-090]], [[CR-092]], [[STORY-009-01]], [[STORY-009-02]], [[STORY-009-03]], [[STORY-009-04]], [[STORY-009-05]], [[STORY-009-06]], [[STORY-009-07]], [[STORY-009-08]]
<!-- END relations -->
