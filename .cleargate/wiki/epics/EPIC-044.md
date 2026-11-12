---
type: epic
id: "EPIC-044"
parent: ""
children: 
  - "[[CR-074]]"
cites: []
cited_by: 
  - "[[BUG-088]]"
  - "[[CR-074]]"
  - "[[CR-120]]"
  - "[[CR-122]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
---

# EPIC-044: Agent Dispatch Reliability & Token Efficiency

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Make serial agent dispatch deterministic (structured verdicts instead of free-text parsing) and token-efficient (prompt-cache-friendly dispatch structure + explicit model tiering), without altering the adversarial 5-agent split or any gate semantics.

## Problem & Value
**Why are we doing this?**
The sprint loop has two efficiency/reliability ceilings the hygiene epic (EPIC-043) deliberately does not touch. **(1) Reliability:** serial dispatches return free text (`"QA: PASS"`) that the orchestrator parses heuristically, while the parallel-wave path already returns schema-typed verdicts (`GREEN`/`ESCALATED`/`BLOCKED` + tokens).

[+865 bytes not shown — read .cleargate/delivery/archive/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md]

## Scope
**In:**
- [ ] Structured-verdict contract for **serial** dispatches (Architect/QA/Dev/DevOps) matching the parallel-wave schema; orchestrator consumes the verdict, not prose.
**Out:**
- Any change to the adversarial 5-agent split, gate semantics, worktree isolation, or the MCP store.
- The EPIC-043 hygiene workstreams (docs, templates, flashcard curation, wiki recompile, surface hygiene,

[+856 bytes not shown — read .cleargate/delivery/archive/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md]

## Architecture rules
- Do NOT alter the QA-Red seal, immutable-red-tests, DevOps single-writer, or bounce-cap. These are the integrity core; this epic optimizes dispatch mechanics around them.
- Structured-verdict adoption must MATCH the shape the parallel-wave path already returns (GREEN/ESCALATED/BLOCKED + tokens) so serial and parallel converge on one contract, not two.

[+295 bytes not shown — read .cleargate/delivery/archive/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md]

## Decisions
- **Q1 — verdict transport.** How does a serial subagent return a structured verdict to the orchestrator — a sentinel block in its final message the orchestrator parses, a written `verdict.json` artifact, or the StructuredOutput tool pattern the review workflows use? **Recommended:** the StructuredOutput/schema pattern (same as parallel).

[+636 bytes not shown — read .cleargate/delivery/archive/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (1): [[CR-074]]
- Cited by (4): [[BUG-088]], [[CR-074]], [[CR-120]], [[CR-122]]
<!-- END relations -->
