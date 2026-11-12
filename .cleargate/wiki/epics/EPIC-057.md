---
type: epic
id: "EPIC-057"
parent: ""
children: []
cites: 
  - "[[BUG-033]]"
  - "[[BUG-041]]"
  - "[[BUG-045]]"
  - "[[BUG-046]]"
  - "[[CR-108]]"
  - "[[CR-126]]"
  - "[[EPIC-033]]"
  - "[[EPIC-055]]"
cited_by: 
  - "[[BUG-087]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "d3ca3bef420c543e8cc459e9333b736e15a556ba"
repo: "planning"
sprint_cleargate_id: "SPRINT-39"
---

# EPIC-057: Multi-repo story execution — routing, not just detection

**Status:** Draft · **Sprint:** SPRINT-39 · **Gate:** fail: interrogation-resolved

## Objective
Let a story whose file surface lives outside the worktree-reachable tree execute correctly, by declaring repo topology in config.yml and routing each story to the right checkout with the right branch.

## Problem & Value
**Why are we doing this?**

ClearGate's execution model assumes one repo and one worktree per story. Real repos violate that constantly: gitignored vendored dependencies, git submodules, generated/ignored workspace packages, polyrepo products, and monorepos with ignored build outputs. A `git worktree add` materializes **tracked files only**, so any story whose surface touches such a path lands in a worktree where the path does not exist.

[+990 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md]

## Scope
**In:**
- [ ] A `repos:` block in `config.yml` declaring each satellite checkout: path, whether it is an independent git repo, and its branch-naming convention.
**Out:**
- **Atomic cross-repo merge.** Two repos cannot merge atomically. The honest deliverable is explicit ordering plus a named inconsistency window, not the illusion of atomicity.
- Reimplementing path classification — [[BUG-046]] owns it.

[+747 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md]

## Architecture rules
- Must consume BUG-046's reachability classification — do NOT reimplement path classification
- Must not run `git worktree add` inside a nested independent repo (cleargate-enforcement.md §1.3)
- Cross-repo atomic merge is impossible and is explicitly not attempted — see OUT-OF-SCOPE
- Topology is declared per-install in config.yml; never hardcode cli/mcp/admin (they are this repo's shape, not every repo's)

## Open questions
- "Where does repo topology come from? Three options with different costs. (a) Hand-declared in `config.yml` — explicit, but every user must write it and it silently rots when a path moves. (b) Auto-detected by scanning for nested `.git` directories and gitignored roots at `cleargate init` / `doctor` time — zero user effort, but guesses intent and may mis-classify a vendored dir as a satellite repo.

[+249 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (8): [[BUG-033]], [[BUG-041]], [[BUG-045]], [[BUG-046]], [[CR-108]], [[CR-126]], [[EPIC-033]], [[EPIC-055]]
- Cited by (1): [[BUG-087]]
<!-- END relations -->
