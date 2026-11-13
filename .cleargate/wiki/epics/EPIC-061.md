---
type: epic
id: "EPIC-061"
parent: ""
children: 
  - "[[STORY-061-01]]"
  - "[[STORY-061-02]]"
  - "[[STORY-061-03]]"
cites: 
  - "[[BUG-053]]"
  - "[[BUG-060]]"
  - "[[BUG-085]]"
  - "[[BUG-091]]"
  - "[[BUG-092]]"
  - "[[BUG-093]]"
  - "[[BUG-095]]"
  - "[[BUG-107]]"
  - "[[BUG-109]]"
  - "[[CR-075]]"
  - "[[CR-099]]"
  - "[[EPIC-043]]"
  - "[[EPIC-056]]"
  - "[[EPIC-058]]"
  - "[[PROPOSAL-074]]"
  - "[[STORY-058-02]]"
  - "[[STORY-061-01]]"
  - "[[STORY-061-02]]"
  - "[[STORY-061-03]]"
cited_by: 
  - "[[BUG-060]]"
  - "[[EPIC-056]]"
  - "[[STORY-061-03]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-061_cli_repo_hygiene_and_layout.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "bde3df00c4e5fa7a80394a55aca94c02660df348"
repo: "planning"
---

# EPIC-061: cleargate-cli Hygiene, Layout & Public Release

**Status:** Draft · **Sprint:** none · **Gate:** pass

## Objective
Restructure cleargate-cli so its layout follows its domains and its working tree holds only source, and its docs and metadata are accurate. Then ship it the way the owner wants: npm carries only the installer, runtime and one copy of the installed payload, and the factory's source becomes the public GitHub repo sandrinio/cleargate. No command changes behaviour, and no host's installed result changes.

## Problem & Value
**Why are we doing this?**
cleargate-cli has 612 commits across 41 sprints and has never had a layout pass:
- A 49-entry `src/lib/` grab-bag spans six domains, and wiki code is split across four places.
- `scripts/` mixes build, guard and finished one-shot scripts. `templates/` mixes tracked source with two build outputs.
- Stray artifacts sit in the tree, and 53 test-run incident files are committed.
- There is no CI, and the README lists commands that don't exist.

[+1,424 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-061_cli_repo_hygiene_and_layout.md]

## Scope
**In:**
- [x] **S12 Self-contained test suite.** *(Done 2026-11-07: [[STORY-061-01]] + [[STORY-061-02]], cli merge `02c1d8b`.)* Make `npm test` pass in a standalone clone and stop it writing outside the cli checkout.
**Out:**
- Any change to command behaviour, flags, output or exit codes. S10 changes where `init` reads its payload from, not what it installs.
- Any move inside `scaffold/**` (EPIC-058).
- Fixing the *cause* of the incident files ([[BUG-109]]).

[+6,845 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-061_cli_repo_hygiene_and_layout.md]

## Architecture rules
- Zero behaviour change. For every story, typecheck is clean and the full `npm test` adds no failing test beyond the failure list recorded at the epic's base commit (§3 Test ratchet).
- Payload identity. S1–S4 keep `templates/cleargate-planning/**` byte-identical to the epic's base commit. S10 removes that flat copy. From S10 on, the identity check is the tree that `init --host claude`, `--host codex` and `--host all` produce in a scratch repo, which must match the pre-S10 baseline.

[+711 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-061_cli_repo_hygiene_and_layout.md]

## Decisions
*(AI Planning Engine: List edge cases, contradictions, or missing details found while drafting. The Epic stays 🔴 until the Human answers all of these.)*

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (3): [[STORY-061-01]], [[STORY-061-02]], [[STORY-061-03]]
- Cites (19): [[BUG-053]], [[BUG-060]], [[BUG-085]], [[BUG-091]], [[BUG-092]], [[BUG-093]], [[BUG-095]], [[BUG-107]], [[BUG-109]], [[CR-075]], [[CR-099]], [[EPIC-043]], [[EPIC-056]], [[EPIC-058]], [[PROPOSAL-074]], [[STORY-058-02]], [[STORY-061-01]], [[STORY-061-02]], [[STORY-061-03]]
- Cited by (3): [[BUG-060]], [[EPIC-056]], [[STORY-061-03]]
<!-- END relations -->
