---
type: epic
id: "EPIC-043"
parent: ""
children: 
  - "[[BUG-036]]"
  - "[[BUG-037]]"
  - "[[BUG-038]]"
  - "[[BUG-039]]"
  - "[[BUG-050]]"
  - "[[BUG-051]]"
  - "[[BUG-052]]"
  - "[[BUG-053]]"
  - "[[BUG-054]]"
  - "[[BUG-056]]"
  - "[[BUG-057]]"
  - "[[BUG-058]]"
  - "[[BUG-061]]"
  - "[[BUG-062]]"
  - "[[BUG-063]]"
  - "[[BUG-064]]"
  - "[[BUG-065]]"
  - "[[BUG-066]]"
  - "[[BUG-117]]"
  - "[[CR-075]]"
  - "[[CR-076]]"
  - "[[CR-093]]"
  - "[[CR-094]]"
  - "[[CR-095]]"
  - "[[CR-096]]"
  - "[[CR-097]]"
  - "[[CR-098]]"
  - "[[CR-099]]"
  - "[[CR-101]]"
  - "[[CR-102]]"
  - "[[CR-113]]"
  - "[[CR-114]]"
  - "[[STORY-043-01]]"
  - "[[STORY-043-02]]"
  - "[[STORY-043-03]]"
  - "[[STORY-043-04]]"
  - "[[STORY-043-05]]"
  - "[[STORY-043-06]]"
  - "[[STORY-043-07]]"
  - "[[STORY-043-08]]"
  - "[[STORY-043-09]]"
  - "[[STORY-043-10]]"
cites: []
cited_by: 
  - "[[BUG-066]]"
  - "[[CR-131]]"
  - "[[EPIC-052]]"
  - "[[EPIC-053]]"
  - "[[EPIC-061]]"
  - "[[STORY-054-03]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-043: Framework Hygiene & Efficiency Remediation

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Garbage-collect three superseded/stale documentation surfaces, cut two per-session and per-story efficiency taxes, and remove dead/plumbing surface area — without touching the framework's load-bearing core (the 5-agent split, gates 1-4, worktree isolation, the MCP items store).

## Problem & Value
**Why are we doing this?**
A source-level review found the framework's core is sound but carries removable debt: a tutorial (root README) that instructs users to do the one thing the framework forbids; a per-edit wiki recompile that rebuilds all four synthesis pages dozens of times per story; an unbounded 66KB FLASHCARD that is now larger than the protocol it serves and is paid as a session-start token tax; two unconditional Architect

[+1,545 bytes not shown — read .cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md]

## Scope
**In:**
- [ ] **WS1 — Doc truth (kill the day-one contradictions).** Rewrite `README.md` §"Getting started in 10 minutes": drop "File a proposal" (→ "File a ClearGate Epic/Story"), drop `close_sprint.mjs --assume-ack` (→
**Out:**
- **Execution-mode v1/v2 collapse** — owned by **CR-070** (Approved). This Epic must not edit the `execution_mode` lines, the inert-mode message, or `state.schema.json` schema bump. Sequence after CR-070 merges.

[+6,775 bytes not shown — read .cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md]

## Architecture rules
- Do NOT re-implement execution-mode collapse — that is CR-070 (Approved). This Epic SEQUENCES AFTER CR-070 and must not edit the same execution_mode lines.
- Do NOT touch parallel-wave (launch_wave.mjs) or the token-ledger 3-level attribution fallback — EPIC-033 shipped these and the fallback is required for parallel dispatch attribution.
- Do NOT change QA-Verify's test scope behavior — that is EPIC-031/STORY-031-02.

[+923 bytes not shown — read .cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md]

## Decisions
*(The Epic stays 🟡/🔴 until these are answered.)*

- **Q1 — Flashcard cleanup mechanism.** ✅ RESOLVED 2026-06-01. Owner: mechanical age/byte rotation is wrong — flashcards are project-specific lessons and a relevant one must not be evicted just for being old.

[+1,414 bytes not shown — read .cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (42): [[BUG-036]], [[BUG-037]], [[BUG-038]], [[BUG-039]], [[BUG-050]], [[BUG-051]], [[BUG-052]], [[BUG-053]], [[BUG-054]], [[BUG-056]], [[BUG-057]], [[BUG-058]], [[BUG-061]], [[BUG-062]], [[BUG-063]], [[BUG-064]], [[BUG-065]], [[BUG-066]], [[BUG-117]], [[CR-075]], +22 more
- Cited by (6): [[BUG-066]], [[CR-131]], [[EPIC-052]], [[EPIC-053]], [[EPIC-061]], [[STORY-054-03]]
<!-- END relations -->
