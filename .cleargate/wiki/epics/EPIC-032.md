---
type: epic
id: "EPIC-032"
parent: ""
children: 
  - "[[CR-091]]"
  - "[[STORY-032-01]]"
  - "[[STORY-032-02]]"
  - "[[STORY-032-03]]"
cites: []
cited_by: 
  - "[[CR-091]]"
  - "[[CR-103]]"
  - "[[EPIC-052]]"
  - "[[EPIC-053]]"
  - "[[STORY-032-01]]"
  - "[[STORY-032-02]]"
  - "[[STORY-032-03]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "eb44e22d41c078a7f8efd139e15a6dfee49f91c2"
repo: "planning"
sprint_cleargate_id: "SPRINT-30"
---

# EPIC-032: Code-Map Awareness Layer for Execution Agents

**Status:** Completed · **Sprint:** SPRINT-30 · **Gate:** pass

## Objective
Emit a token-budgeted structural skeleton (exports + signatures + module relationships) of each TypeScript package into .cleargate/wiki/code/&lt;package&gt;.md, refreshed by the existing wiki compile pipeline, so Architect/Developer agents read structure once per dispatch instead of re-grepping source.

## Problem & Value
**Why are we doing this?**
The Architect agent currently rediscovers source structure on every dispatch — grep + read raw files — burning ~5–15k input tokens per milestone plan and producing plans that vary in grounding quality across runs. ClearGate already compiles a *work-item* awareness layer (`.cleargate/wiki/index.md`, ~3k tokens); the *code* equivalent does not exist.

[+729 bytes not shown — read .cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md]

## Scope
**In:**
- [ ] Per-package TypeScript skeleton extractor: exports, public types, function/class signatures (no bodies).
- [ ] Module-relationship summary per package: which modules import which (top-level only).
**Out:**
- Non-TypeScript languages (Python/Go/Rust/Svelte template syntax — Svelte `.svelte` script blocks may be in scope but defer to a Q in §6).
- Runtime call graphs or dynamic-dispatch resolution.

[+1,333 bytes not shown — read .cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md]

## Architecture rules
- Reuse the existing wiki compile pipeline (cleargate-cli/src/wiki/**) — code-map is a new bucket/synthesis pass, not a parallel system.
- Drift detection uses git-SHA per ADR locked 2026-04-19 (same as work-item ingest). No content hashing.
- No new runtime dependency in target repos beyond what `tsc` already provides.

[+1,120 bytes not shown — read .cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md]

## Decisions
- "Which packages get code-mapped in the first ship — only `cleargate-cli/`, all three (cleargate-cli + mcp + admin), or configurable… → ALL discovered packages, with clear per-package separation (one page each). **Generalize — no hardcoded list:** the extractor DISCOVERS packages by walking for `tsconfig.json` roots (fallback `package.json`), because ClearGate ships to many repos with arbitrary layouts; in this meta-repo discovery yields

[+3,374 bytes not shown — read .cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[CR-091]], [[STORY-032-01]], [[STORY-032-02]], [[STORY-032-03]]
- Cited by (7): [[CR-091]], [[CR-103]], [[EPIC-052]], [[EPIC-053]], [[STORY-032-01]], [[STORY-032-02]], [[STORY-032-03]]
<!-- END relations -->
