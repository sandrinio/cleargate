---
sprint_id: SPRINT-23
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-23
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Draft
execution_mode: v2
start_date: 2026-05-05
end_date: 2026-05-16
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T09:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Sprint 2 of the SDLC Hardening multi-sprint roadmap (see
  `.cleargate/scratch/SDLC_hardening_continued.md`). SPRINT-22 landed the
  structural changes (TDD discipline + DevOps role + reporter doc fix);
  SPRINT-23 lands the cross-cutting tooling that makes the new role model
  run smoothly.

  Theme: "make the disciplined loop ergonomic" — Sprint Context File so
  cross-cutting rules propagate without dispatch boilerplate (CR-045);
  run_script.sh wrapper so script failures get structured incident reports
  instead of raw bash output (CR-046); Mid-Sprint Triage rubric + Test
  Pattern Validation gate so user input flows through deterministic
  routing AND Architect catches Red-test wiring issues before Dev wastes
  cycles (CR-047); orphan-drift cleanup that the SPRINT-21 reconciler
  missed + reconciler hardening to prevent future misses (CR-048).

  Carry-over from SPRINT-22 close: 8 SPRINT-21 CRs in pending-sync with
  status: Ready (CR-031, CR-032, CR-033, CR-034, CR-035, CR-037, CR-038,
  CR-039) — CR-048 mechanical sweep + reconciler hardening covers this.

  V-Bounce-Engine references inform CR-045/046/047 design; concrete line
  citations in each anchor's context_source.

  Drafted in SPRINT-22 close session 2026-05-04; will be reviewed +
  approved + activated in a fresh Claude Code session. Sprint stays
  status: Draft, approved: false until that session.
epics: []
stories: []
crs:
  - CR-045
  - CR-046
  - CR-047
  - CR-048
bugs: []
proposals: []
approved: false
human_override: false
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T09:58:56Z
stamp_error: no ledger rows for work_item_id SPRINT-23
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T09:57:11Z
  sessions: []
---

# SPRINT-23: SDLC Hardening — Cross-Cutting Tooling

## 0. Stakeholder Brief

> Sponsor-readable summary.

- **Sprint Goal:** Make the SPRINT-22 disciplined loop ergonomic by adopting 3 V-Bounce-inspired tooling patterns (Sprint Context File CR-045, run_script.sh wrapper CR-046, Mid-Sprint Triage rubric + TPV gate CR-047) plus a one-time orphan cleanup with reconciler hardening (CR-048). After this sprint, cross-cutting sprint rules propagate to every dispatch via a single file; script failures become structured incident reports instead of raw bash output; mid-sprint user input has deterministic Bug/Clarification/Scope/Approach routing; lifecycle reconciler catches cross-sprint orphan drift that SPRINT-21's close missed.
- **Business Outcome:** Per-story dispatch boilerplate shrinks (cross-cutting rules move out of dispatch text); script-failure investigation moves from "manually re-run + capture context" to "read structured incident JSON in agent report"; mid-sprint feedback classification becomes auditable; sprint close pipeline catches the drift class that left 8 SPRINT-21 orphans in pending-sync. Net expected impact on SPRINT-24+: ~10-15% additional wall-clock reduction per story (on top of SPRINT-22's 30-40% from role refinement).
- **Risks (top 3):**
  1. **CR-047 inserts TPV between QA-Red and Dev** — adds 1 dispatch per standard-lane story. Cost: ~5min Architect read-only review. If Dev's Green attempts on CR-047-shipped TPV-approved tests still fail because of wiring issues TPV missed, cost compounds. Mitigation: CR-047 acceptance #6 covers 4 wiring-gap scenarios; if TPV miss-rate >10% in SPRINT-24, downgrade to advisory.
  2. **CR-045's Sprint Context File becomes write-only** — orchestrator writes it but no agent actually reads it because preflight is hand-waved. Mitigation: CR-045 acceptance #3 mandates Preflight section in EVERY agent prompt explicitly Reading the file; reporter aggregates "did dispatches honor preflight?" signal.
  3. **CR-046 wrapper adopted unevenly** — some agents bypass the wrapper out of habit. Mitigation: CR-046 SKILL.md update mandates wrapper for Dev/QA/Architect/DevOps script invocations; SPRINT-24 retrospective audits wrapper-adoption rate.
- **Metrics:**
  - **Sprint Context File read-rate:** ≥1 SPRINT-24 standard-lane story has every agent dispatch's preflight log line "Read sprint-context.md" (validated retrospectively at SPRINT-24 close).
  - **Script-incident reporting rate:** ≥1 script-incident JSON written and consumed by Reporter in SPRINT-24 (validates the wrapper is wired end-to-end).
  - **Mid-sprint triage classification:** if SPRINT-24 has any mid-sprint user input, it's classified into one of 4 rubric classes with documented routing.
  - **TPV catch rate:** ≥1 TPV dispatch in SPRINT-24 catches a wiring gap; if 0 catches across SPRINT-24+SPRINT-25, downgrade TPV to fast-lane-skip.
  - **Orphan drift:** post-CR-048, lifecycle reconciler at SPRINT-24 close detects 0 orphan CRs in pending-sync (or detects + remediates them automatically per the new rule).

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`CR-045`](CR-045_Sprint_Context_File.md) | CR | Sprint Context File — orchestrator dispatches read this once | standard | M | y (W1 parallel) | low | W1 |
| [`CR-046`](CR-046_Run_Script_Wrapper.md) | CR | run_script.sh wrapper + script-incidents reporting | standard | M | y (W1 parallel) | low | W1 |
| [`CR-047`](CR-047_Mid_Sprint_Triage_And_Test_Pattern_Validation.md) | CR | Mid-sprint triage rubric + Test Pattern Validation gate | standard | M-L | y (W1 parallel) | med | W1 |
| [`CR-048`](CR-048_Sprint_21_Orphan_Drift_Cleanup.md) | CR | SPRINT-21 orphan drift cleanup + reconciler hardening | fast | XS-S | y (W1 parallel) | low | W1 |

**Estimated totals:** 4 items, 1 wave. Complexity: 1×XS-S + 3×M-L. Lane mix: 1 fast / 3 standard. Parallelism: W1 = 4 parallel dispatches.

**Dispatch unit estimate (post-CR-043 + CR-044):** ~4 Architect M1 SDR/M-plan + 3 QA-Red dispatches (CR-045/046/047 — fast-lane CR-048 skips QA-Red) + 4 Dev dispatches + 4 QA-Verify dispatches + 3 Architect post-flights (CR-048 fast-lane skip) + 4 DevOps dispatches. Total ~22 dispatches in this sprint vs SPRINT-22's ~12. Step-up explained: TPV adds 3 dispatches (one per standard-lane CR via CR-047's own gate); DevOps adds 4 (one per CR per CR-044). Cost discipline holds because each dispatch is bounded.

## 2. Execution Strategy

### 2.1 Phase Plan (preliminary)

**Wave 1 — Four parallel dispatches:**

| Item | What it produces | Who consumes |
|---|---|---|
| **CR-045** | `.cleargate/sprint-runs/<id>/sprint-context.md` written at kickoff; every agent prompt has Preflight section instructing Read | Future dispatches read cross-cutting rules from a single file; orchestrator dispatch text shrinks |
| **CR-046** | NEW `run_script.sh` wrapper + `cleargate-cli/src/lib/script-incident.ts` schema; SKILL.md mandates wrapper for agent script calls | Future Dev/QA/Architect/DevOps dispatches invoke scripts via wrapper; failures get structured incident JSONs auto-aggregated by Reporter |
| **CR-047** | `.cleargate/knowledge/mid-sprint-triage-rubric.md` + `cleargate-cli/src/lib/triage-classifier.ts` + Architect TPV-mode + SKILL.md §C.10 | Future mid-sprint user input flows through deterministic 4-class rubric; standard-lane stories run TPV between QA-Red and Dev |
| **CR-048** | 8 SPRINT-21 orphans archived + `lifecycle-reconcile.ts` extended with cross-sprint orphan detection rule | Future sprint closes catch the orphan-drift class; pending-sync stays clean |

→ Four parallel Developer dispatches. Merge order driven by SKILL.md hot-file analysis (§2.2). All 4 CRs go through the new SPRINT-22 5-step loop: Architect M1 → QA-Red → Dev → QA-Verify → Architect post-flight + DevOps merge (CR-048 fast-lane skips QA-Red + Architect post-flight).

### 2.2 Merge Ordering

| Shared File | Items | Merge Order | Rationale |
| --- | --- | --- | --- |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | CR-045 (§A.3 + §B + §C dispatch contracts), CR-046 (§C dispatch contracts), CR-047 (§C.10 NEW + §C.3 sequence amendment) | CR-045 → CR-046 → CR-047 | CR-045 documents Preflight sprint-context.md read; CR-046 adds wrapper-mandatory rule; CR-047 inserts TPV between QA-Red and Dev (renumber if needed). Architect M1 plan locks line ranges per §2.3. |
| `cleargate-planning/.claude/agents/architect.md` | CR-045 (Preflight), CR-046 (Script Invocation), CR-047 (Mode: TPV) | CR-045 → CR-046 → CR-047 | Three additive sections; sequential merge keeps each insert clean. |
| `cleargate-planning/.claude/agents/qa.md` | CR-045 (Preflight), CR-046 (Script Invocation), CR-047 (RED-mode wiring acceptance) | CR-045 → CR-046 → CR-047 | Same pattern as architect.md. |
| `cleargate-planning/.claude/agents/{developer,devops,reporter}.md` | CR-045 (Preflight), CR-046 (Script Invocation) | CR-045 → CR-046 | CR-047 doesn't touch these. |
| `.cleargate/scripts/init_sprint.mjs` | CR-045 only | n/a | Single-CR edit. |
| `cleargate-cli/src/lib/lifecycle-reconcile.ts` | CR-048 only | n/a | Single-CR edit. |

### 2.3 Shared-Surface Warnings

- **SKILL.md §C re-renumbering risk:** CR-047 may insert §C.10 NEW or amend §C.3 sequence to include TPV. Combined with CR-045 + CR-046 prose additions, line ranges shift. Architect M1 plan MUST pin exact line ranges per CR. Same pattern as SPRINT-22 W1.
- **Agent prompt cumulative growth:** 5 agent prompt files each get +2-3 sections from CR-045/046/047. Architect SDR audits cumulative size; if any prompt exceeds ~500 lines post-merge, flag for SPRINT-24 condensation CR.
- **CR-045 + CR-046 + CR-047 + CR-048 all run under the new SPRINT-22 5-step loop.** This is the dogfood validation — does the new loop actually run smoothly for 4 parallel stories? SPRINT-23's own retrospective informs the SPRINT-22 acceptance criteria (CR-043 #8: ≥1 standard-lane story uses QA-Red and the failing test catches a defect Dev would have shipped — track this for SPRINT-23).
- **CR-048 mechanical archive may temporarily break wiki ingest** for the 8 archived files (paths change). Mitigation: wiki rebuild at sprint close handles re-ingest from archive paths.

### 2.4 Lane Audit (preliminary)

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| CR-045 | standard | Multi-surface (init_sprint + SKILL + 5 agent prompts + 1 test); template skeleton exists |
| CR-046 | standard | NEW wrapper + schema + SKILL + 5 agent prompts + 1 test |
| CR-047 | standard | NEW knowledge doc + classifier lib + SKILL §C.10 + 2 agent prompts + 2 tests |
| CR-048 | fast | Mechanical archive (8 files) + 1 reconciler extension + 1 test; bounded |

### 2.5 ADR-Conflict Flags (preliminary)

- **None blocking.** SPRINT-23's design lives within established invariants (mirror-parity, file-surface contract, real-infra-no-mocks, archive-immutability §11.4).
- **Soft flag:** CR-046's `.cleargate/sprint-runs/<id>/.script-incidents/` directory is NEW — lifecycle reconciler may need awareness of it (probably no — it's a sprint-run artifact, not a delivery item). CR-048's reconciler extension should NOT regress on script-incidents files.
- **Soft flag:** CR-047's TPV gate adds an Architect dispatch per standard-lane story. Token economics: ~1.5× Architect dispatches per sprint. Reporter aggregates; if cost exceeds savings from fewer Dev cycles, flag for SPRINT-24 review.

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| CR-047 TPV adds dispatches without catching defects | Acceptance #6 covers 4 wiring-gap scenarios; SPRINT-24 retrospective tracks miss-rate; downgrade to advisory if 0 catches |
| CR-045 Sprint Context File becomes write-only | Acceptance #3 mandates Preflight section in every agent prompt explicitly Reading the file; reporter signal |
| CR-046 wrapper adopted unevenly | SKILL.md mandates wrapper for Dev/QA/Architect/DevOps; SPRINT-24 audit |
| CR-048 archive breaks wiki ingest | Wiki rebuild at sprint close re-ingests from archive paths |
| 4-CR sprint width with 22-dispatch estimate | Acceptable — each dispatch bounded; new 5-step loop's per-dispatch cost is lower than pre-SPRINT-22; if any dispatch >2× wall-clock budget, surface to human |
| Live `.claude/` re-sync forgotten post-merge | Add to `.doc-refresh-checklist.md` at sprint close: "After CR-045/046/047/048 merge, re-sync live via cleargate init or hand-port qa.md + 4 other agents + SKILL.md + run_script.sh + lifecycle-reconcile.ts" |
| Mid-sprint user feedback restructures plan | CR-047's own rubric is the answer. Use it self-referentially — first instance of "the formal triage" is when SPRINT-23 itself faces mid-sprint input |

## 4. Execution Log

_(Populated by orchestrator + Reporter during sprint execution. Empty at draft time.)_

| Date | Event Type | Description |
| --- | --- | --- |

## 5. Metrics & Metadata

- **Expected Impact:** Cumulative wall-clock reduction per standard-lane story (vs pre-SPRINT-22 baseline) ~40-50% post-SPRINT-23. Sprint Context File eliminates ~500-800 tokens of cross-cutting boilerplate per dispatch. run_script.sh eliminates ad-hoc script-failure investigation. Mid-sprint triage eliminates judgment-call drift. Orphan reconciliation eliminates a class of sprint-close blind spot.
- **Priority Alignment:** Direct user request 2026-05-04 ("go ahead with preparing everything for next sprint"). This sprint is Sprint 2 of a 2-3 sprint continuation per `.cleargate/scratch/SDLC_hardening_continued.md`.
- **Outstanding from SPRINT-22:** none. Three carry-over CRs (CR-040, CR-041, CR-042) all resolved at SPRINT-22 close (040 dropped; 041 deferred indefinitely; 042 shipped). 8 SPRINT-21 orphans handled by CR-048.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** This sprint runs UNDER the new SPRINT-22 5-step loop (Architect → QA-Red → Dev → QA-Verify → Architect post-flight → DevOps). It's the first dogfood validation of the loop. CR-048 is fast-lane (skips QA-Red + Architect post-flight per CR-043 lane rules). CR-045/046/047 are standard.
- **Relevant Context:**
  - `cleargate-cli/test/_node-test-runner.md` — node:test runner convention (npm test routes to node:test only, vitest opt-in)
  - `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C — 5-step loop documented post-CR-043 + CR-044 merge
  - `.cleargate/scratch/SDLC_hardening_continued.md` — multi-sprint roadmap context
  - V-Bounce-Engine references in each CR's context_source
- **Constraints:**
  - **NO VITEST.** `npm test` routes to node:test (no change vs SPRINT-22).
  - All NEW tests use `*.node.test.ts` (Dev-authored) or `*.red.node.test.ts` (QA-Red-authored, immutable for Devs per CR-043).
  - Mirror parity per-edit, not state-parity.
  - Pre-commit `npm run typecheck` + `npm test` (node:test only).
  - **Sprint stays status: Draft until next session reviews + approves Brief + flips to Active.**
  - Live `.claude/` re-sync at sprint close per Gate-4 doc-refresh checklist.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Drafted 2026-05-04 in SPRINT-22-close session; awaiting Brief review in next Claude Code session**

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 4 anchor items decomposed and linked in §1 (CR-045 ✅, CR-046 ✅, CR-047 ✅, CR-048 ✅).
- [x] Sprint Goal articulated (§0 Stakeholder Brief).
- [x] Wave structure preview present (§2.1 with 1 wave, 4 parallel dispatches).
- [x] All anchor files drafted in `pending-sync/`; each pass `cr.ready-to-apply` gate.
- [ ] **Architect SDR** populates §§2.1-2.5 with line-range stencils (DEFERRED to first dispatch in next session).
- [x] Risks enumerated with mitigations (§3 — 7 items).
- [ ] **All anchors at 🟢:** currently 🟡 (each anchor has §0.5 Open Questions awaiting Brief review in next session).
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (next session).
