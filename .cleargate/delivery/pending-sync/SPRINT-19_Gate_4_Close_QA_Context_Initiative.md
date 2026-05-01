---
sprint_id: "SPRINT-19"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-19"
carry_over: false
lifecycle_init_mode: "block"
remote_id: null
source_tool: "local"
status: "Approved"
execution_mode: "v2"
start_date: "2026-05-02"
end_date: "2026-05-15"
created_at: "2026-05-01T22:30:00Z"
updated_at: "2026-05-01T22:30:00Z"
created_at_version: "cleargate@0.10.0"
updated_at_version: "cleargate@0.10.0"
context_source: "SDLC brainstorm charter §2.4 — Sprint 3 of 3 of the SDLC redesign roadmap. Anchor: CR-022 (Gate 4 close pipeline hardening, charter-locked, drafted post-SPRINT-18 close per charter §2.4 line 272 instruction). Plus three follow-on anchors filed during or after SPRINT-18: CR-024 (QA Context Pack + Lane Playbook, filed mid-SPRINT-18 in response to three near-identical DoD §4.1 test-omission kickbacks), CR-025 (Initiative rename + MCP pull flow, user-confirmed 2026-05-01 closing charter §2.1 + §2.5 open questions), BUG-024 (Token-ledger attribution spike, investigation-only; SPRINT-18 mid-close diagnosis surfaced 3 root-cause defects). Pre-existing wiki-lint debt (34 broken-backlink findings on EPIC-023/024/025 wiki pages) is not in scope here — addressed by CR-022 M5 via the new --allow-wiki-lint-debt waiver flag, with batch-fix deferred to a SPRINT-20 cleanup hotfix."
epics: []
crs: ["CR-022", "CR-024", "CR-025"]
bugs: ["BUG-024"]
proposals: []
approved: true
approved_at: "2026-05-01T22:30:00Z"
approved_by: "sandrinio"
activated_at: null
human_override: false
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
---

# SPRINT-19: Sprint 3 — Gate 4 Close + QA Context + Initiative Rename + Token-Ledger Spike

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Close out the SDLC redesign trilogy (Sprint 3 of 3) by hardening the Gate 4 close pipeline (CR-022), introducing structured QA context handoffs that cut review-cycle time and false-passes (CR-024), retiring the legacy Proposal artifact in favor of an Initiative-based stakeholder intake flow (CR-025), and diagnosing the long-standing token-ledger attribution defect that has Red'd cost accounting since SPRINT-15 (BUG-024).
- **Business Outcome:** Sprint close becomes deterministic + auditable (worktree closure + main-merge enforced before Completed); QA review cycles become consistent and lane-aware (cuts cost on doc-only stories, deepens runtime stories); Initiative becomes the canonical stakeholder-input shape with a clean MCP-pull intake; per-agent / per-story cost accounting becomes recoverable (CR-026 in SPRINT-20 lands the fix; BUG-024 lands the diagnosis).
- **Risks (top 3):** (i) SPRINT-19 capacity is heavier than SPRINT-18 (4 anchors, ~12 stories vs SPRINT-18's 7); waves must stay disjoint or sequencing slips. (ii) `close_sprint.mjs` is the most-touched file in the repo across CR-021 (SPRINT-18) + CR-022 (this sprint); careful merge ordering required. (iii) CR-025's Initiative rename touches CLAUDE.md + protocol surfaces already touched by CR-022's M6; sequential merge order documented in §2.2.
- **Metrics:** CR-022 success criteria — Steps 2.7 + 2.8 block close on real failure scenarios; Steps 6.5/6.6/6.7 produce non-empty `improvement-suggestions.md` sections; Step 8 prints 6-item handoff. CR-024 — pre_qa_context.mjs bundles ≤20KB on real fixtures; QA cycle time on doc-only stories drops ≥30%. CR-025 — `templates/proposal.md` absent post-CR; zero `[Pp]roposal` hits in protocol/CLAUDE.md outside §11.4 carve-out. BUG-024 — diagnosis filed; CR-026 candidate scope sized at ~100 LOC.

## 1. Consolidated Deliverables

| Item                                                                         | Type | Title                                                       | Lane     | Complexity | Parallel?  | Bounce Exposure | Milestone |
| ---------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- | -------- | ---------- | ---------- | --------------- | --------- |
| [`BUG-024`](BUG-024_Token_Ledger_Attribution_Spike.md)                       | Bug  | Token-ledger attribution spike (investigation-only)         | standard | L1         | y (Wave 1) | low             | M0        |
| [`CR-022 M0`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | `lib/report-filename.mjs` shared helper                     | standard | L1         | y (Wave 1) | low             | M1        |
| [`CR-024 S1`](CR-024_QA_Context_Pack_And_Lane_Playbook.md)                   | CR   | `prep_qa_context.mjs` script + schema                       | standard | L2         | y (Wave 1) | low             | M2        |
| [`CR-025 S1`](CR-025_Initiative_Rename_And_MCP_Pull_Flow.md)                 | CR   | `templates/initiative.md` + delete `proposal.md` + cleanup  | standard | L1         | y (Wave 1) | low             | M3        |
| [`CR-022 M1`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | Step 2.7 worktree-closed pre-close check                    | standard | L2         | y (Wave 2) | med             | M4        |
| [`CR-022 M2`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | Step 2.8 sprint-merged-to-main verify                       | standard | L2         | y (Wave 2) | med             | M5        |
| [`CR-022 M3`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | Steps 6.5/6.6/6.7 post-close additions                      | standard | L2         | y (Wave 2) | med             | M6        |
| [`CR-022 M5`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | Bundle cap raise + `--allow-wiki-lint-debt` flag            | fast     | L1         | y (Wave 2) | low             | M7        |
| [`CR-024 S2`](CR-024_QA_Context_Pack_And_Lane_Playbook.md)                   | CR   | Dev STATUS=done schema + QA agent lane playbook             | standard | L2         | y (Wave 2) | low             | M8        |
| [`CR-025 S2`](CR-025_Initiative_Rename_And_MCP_Pull_Flow.md)                 | CR   | Protocol + agent prose audit + replace                      | standard | L1         | y (Wave 2) | low             | M9        |
| [`CR-025 S3`](CR-025_Initiative_Rename_And_MCP_Pull_Flow.md)                 | CR   | MCP pull-flow doc + PROPOSAL-008/009 archive                | fast     | L1         | n (Wave 3) | low             | M10       |
| [`CR-022 M4`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | Step 8 verbose post-close handoff list                      | fast     | L1         | n (Wave 3) | low             | M11       |
| [`CR-022 M6`](CR-022_Gate_4_Close_Pipeline_Hardening.md)                     | CR   | Protocol + CLAUDE.md updates + agent definition refresh     | standard | L1         | n (Wave 3) | low             | M12       |

**Estimated totals:** 4 anchor items + 13 milestones (1 BUG + 6 CR-022 milestones + 2 CR-024 stories + 3 CR-025 stories + 1 helper extraction) = **13 dispatch units**. Complexity: 7×L1 + 6×L2. Lane mix: 3 fast / 10 standard.

**Wave structure (3 waves; Architect SDR confirmed in §2):**

- **Wave 1 — 4 parallel anchors over disjoint surfaces:** BUG-024 ‖ M1 (CR-022 M0 helper) ‖ M2 (CR-024 S1) ‖ M3 (CR-025 S1).
- **Wave 2 — 6 parallel anchors, gated on Wave 1:** M4 (CR-022 M1) ‖ M5 (CR-022 M2) ‖ M6 (CR-022 M3) ‖ M7 (CR-022 M5) ‖ M8 (CR-024 S2) ‖ M9 (CR-025 S2).
- **Wave 3 — 3 parallel anchors, gated on Wave 2:** M10 (CR-025 S3) ‖ M11 (CR-022 M4) ‖ M12 (CR-022 M6).

**Concurrency profile:** 4 + 6 + 3 = 13 anchors across 3 dispatch rounds. SPRINT-18 was 4+2+1 across 3 rounds; SPRINT-19 doubles Wave 2 because the close-pipeline milestones are highly parallelizable (each touches a distinct script section).

**Note on BUG-024.** Investigation-only — no production code change. The spike output is a follow-up CR candidate scoped at ~100 LOC for SPRINT-20 (filed during sprint close). BUG-024 ships in M0 as a parallel anchor with no downstream blockers; its DoD is met by the diagnosis already captured in §3 of the bug file (drafted 2026-05-01).

## 2. Execution Strategy

*(Populated by Architect Sprint Design Review — DEFERRED. SDR runs after the 4 anchor files reach 🟢 in pending-sync, and updates this section in-place before Gate 2.)*

### 2.1 Phase Plan (preliminary — Architect SDR confirms)

Confirmed wave structure: **3 waves, 4 + 6 + 3 = 13 anchors across 3 dispatch rounds.** Wave 1 spawns 4 Developer agents in parallel over disjoint surfaces (BUG-024 is no-op for Developer — orchestrator-files; CR-022 M0 is the shared helper that Wave 2 close-pipeline stories all depend on; CR-024 S1 is the new prep_qa_context.mjs script under `.cleargate/scripts/`; CR-025 S1 is the templates rewrite + proposal.md deletion). Wave 2 spawns 6 Developer agents in parallel over disjoint surfaces (close-pipeline Steps 2.7 / 2.8 / 6.5+6.6+6.7 / cap-raise+flag; CR-024 S2 dev-doc updates; CR-025 S2 protocol audit). Wave 3 spawns 3 Developer agents over remaining surfaces (CR-025 S3 MCP doc + archive; CR-022 M4 Step 8 stdout; CR-022 M6 protocol + CLAUDE.md).

### 2.2 Merge Ordering (Shared-File Surface Analysis — preliminary)

Files touched by more than one milestone (preliminary; Architect SDR confirms):

| Shared File                                                                | Milestones Touching It | Merge Order      | Rationale |
| -------------------------------------------------------------------------- | ---------------------- | ---------------- | --------- |
| `.cleargate/scripts/close_sprint.mjs` (+ canonical mirror)                 | M4, M5, M6, M11        | M4 → M5 → M6 → M11 | All four insert at different step boundaries; sequential merge order matches step numbering. M11 (Step 8) is last because it's the final stdout block. |
| `.cleargate/scripts/suggest_improvements.mjs` (+ canonical mirror)         | M1 (helper), M6 (Steps 6.6/6.7) | M1 → M6   | M1 extracts shared helper that M6 consumes. |
| `.cleargate/scripts/prep_reporter_context.mjs` (+ canonical mirror)        | M1 (helper consumer), M7 (cap raise) | M1 → M7 | M7's cap raise is independent of M1's helper but lands second to keep merges atomic. |
| `CLAUDE.md` (live + canonical mirror)                                      | M9 (CR-025 protocol audit), M12 (CR-022 close-bullet update) | M9 → M12 | M9 audits + replaces residual "Proposal" mentions; M12 updates Gate-4 close bullet. Disjoint regions but M9 first to land on a clean baseline. |
| `.cleargate/knowledge/cleargate-enforcement.md` (+ canonical)              | M9, M12                | M9 → M12         | Same as CLAUDE.md — disjoint regions, M9 first. |
| `.cleargate/knowledge/cleargate-protocol.md` (+ canonical)                 | M9 only                | n/a              | M9 owns the audit pass. |
| `.claude/agents/architect.md` + `reporter.md` (+ canonicals)               | M9 only                | n/a              | M9 owns the audit pass for these two files only. **`developer.md` + `qa.md` are EXCLUDED from M9 scope** — pre-grep 2026-05-01 returned zero `[Pp]roposal` hits in either; M8 (CR-024 S2) owns those files exclusively. Wave 2 disjointness preserved. |
| `cleargate-cli/src/commands/sprint.ts`                                     | M7 only                | n/a              | M7 adds `--allow-wiki-lint-debt` flag. |
| `.claude/agents/developer.md`, `.claude/agents/qa.md`                      | M8 only                | n/a              | M8 owns the dev STATUS=done schema + QA lane playbook. |
| New file `.cleargate/scripts/lib/report-filename.mjs`                      | M1 only (NEW)          | n/a              | Extracted helper. |
| New file `.cleargate/scripts/sprint_trends.mjs`                            | M6 only (NEW)          | n/a              | Stub script. |
| New file `.cleargate/scripts/prep_qa_context.mjs`                          | M2 only (NEW)          | n/a              | New CR-024 script. |
| New file `.cleargate/templates/initiative.md` (rewrite)                    | M3 only                | n/a              | Template rewrite. |
| Delete `.cleargate/templates/proposal.md`                                  | M3 only                | n/a              | Template deletion. |

### 2.3 Shared-Surface Warnings (preliminary)

- **`close_sprint.mjs` is touched by 4 SPRINT-19 milestones (M4, M5, M6, M11).** Sequential Wave 2 → Wave 3 ordering naturally serializes them, but each Architect milestone plan MUST cite the post-prior-milestone line numbers (the file grows ~100 LOC across these inserts). Architect M6 plan writes after M4 + M5 land; Architect M11 plan writes after M6 lands.
- **`suggest_improvements.mjs` is touched by M1 (helper consume) + M6 (new sections).** M1 ships the shared helper Wave 1; M6 consumes it in Wave 2. Risk: M1's helper API drifts between Wave 1 merge and M6 dispatch. Mitigation: M1 freezes the helper signature (`reportFilename(sprintDirPath, sprintId, opts) → string`) before Wave 1 dev dispatch; M6 architect plan cites the frozen signature.
- **CLAUDE.md is touched by M9 (CR-025 prose audit) + M12 (CR-022 close-bullet update).** Disjoint regions: M9 sweeps for `[Pp]roposal` outside §11.4; M12 updates the Sprint-close-Gate-4-class bullet at line ~125 (verify at edit time). Architect M12 plan must re-grep the bullet anchor after M9 lands (M9 may not shift line numbers but caution flag).
- **CR-025 S1 deletes `templates/proposal.md` while CR-022 M5 doesn't touch templates.** No collision. Listed for completeness.
- **BUG-024 has no production code surface.** It's the spike investigation. Its DoD is met by the diagnosis already in the bug file. M0 dev dispatch is essentially a no-op confirmation pass (orchestrator may skip it if QA accepts the bug file as-is at sprint init time).

### 2.4 Lane Audit (preliminary)

| Story    | Lane   | Rationale (≤80 chars)                                       |
| -------- | ------ | ----------------------------------------------------------- |
| M7 (CR-022 M5) | fast | Constant raise + new flag, ~50 LOC, no schema/runtime change |
| M10 (CR-025 S3) | fast | MCP doc + 2 file moves, mechanical, no new surface |
| M11 (CR-022 M4) | fast | Single stdout block, ~40 LOC, no test surface beyond grep   |

Three fast-lane items vs SPRINT-18's two. All ten others are `lane: standard`. Architect SDR confirms via 7-check rubric.

### 2.5 ADR-Conflict Flags (preliminary)

- **None blocking.** SPRINT-19's design lives within established invariants (mirror-parity, file-surface contract, v2-mode bounce caps, real-infra-no-mocks, archive-immutability §11.4).
- **Soft flag (informational, not blocking):** CR-022 M3 introduces `sprint_trends.mjs` as a stub — full implementation deferred to CR-027 in a future sprint. The stub establishes the close-pipeline wiring + output convention without committing to specific trend metrics. Architect M6 plan should note this so Developer M6 doesn't over-engineer the stub.
- **Soft flag (informational):** BUG-024 is investigation-only; CR-026 lands the fix in SPRINT-20. SPRINT-19's REPORT.md should explicitly flag CR-026 in §6 Tooling so the SPRINT-20 sprint-init pass picks it up.

## 3. Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **Capacity vs SPRINT-18 baseline.** 13 dispatch units vs SPRINT-18's 7 — nearly 2× the load. | Wave structure 4+6+3 keeps round-trip dispatches at 3 (same as SPRINT-18). Each individual story stays L1-L2; no L3. If Wave 2 slips, M11/M12 (Wave 3) descope to SPRINT-20 — both are doc-shaped and low-risk. |
| **`close_sprint.mjs` shared with multiple SPRINT-19 milestones (M4/M5/M6/M11).** Same risk as SPRINT-18's CR-021 vs CR-022 cross-sprint, now intra-sprint. | Sequential Wave 2 → Wave 3 ordering. Architect milestone plans for each cite post-prior-milestone line numbers. Stash discipline mid-sprint (lesson from SPRINT-18 Wave 2 merges). |
| **Token-ledger Red carries forward into SPRINT-19.** BUG-024 diagnoses; CR-026 fixes in SPRINT-20. SPRINT-19's own ledger will continue to mis-attribute. | Accept the carry. SPRINT-19 REPORT.md §6 Tooling explicitly notes this + flags CR-026. SPRINT-20 sprint-init picks up CR-026 as the first anchor. |
| **CR-025 S1 deletes `templates/proposal.md`.** Any pre-existing automation or test scaffolds that import the file will break. | Pre-implementation grep across `cleargate-cli/`, `.cleargate/scripts/`, `.cleargate/knowledge/` for `proposal.md` references. M3 Architect plan enumerates findings + lockstep updates. |
| **34 wiki-lint broken-backlink findings unresolved.** Pre-existing data debt from SPRINT-16/17/18. | CR-022 M5 ships the `--allow-wiki-lint-debt` flag waiver path. Batch-fix (populate `children:` arrays on epic wiki pages) deferred to SPRINT-20 hotfix or CR-028. Surface in SPRINT-19 REPORT.md §6 Tooling as Yellow. |
| **Pre-existing admin/+mcp/ vitest failures.** ~5-7 failing test files (mcp/ subrepo absent in worktrees, snapshot-drift, hotfix-new). Carried forward from prior sprints. | Out-of-scope. Track in REPORT.md §6 Tooling as carry-over. Surface as candidate for a SPRINT-20 infra-cleanup hotfix if not already covered. |

## 4. Execution Log

_(Populated by orchestrator + Reporter during sprint execution. Empty at draft time.)_

| Date | Event Type | Description |
|---|---|---|

## 5. Metrics & Metadata

- **Expected Impact:** Sprint close becomes deterministic with worktree + main-merge enforcement; QA cycle becomes consistent + lane-aware (~30% time reduction on doc-only stories); Initiative becomes the canonical stakeholder-input shape; token-ledger root cause diagnosed (fix in SPRINT-20). Closes the SDLC redesign trilogy.
- **Priority Alignment:** SDLC charter §2.4 Sprint 3 of 3 commitment. User 2026-05-01: "agree with all. draft the sprint plan, spike the token bug and update the sprint plan with your findings."
- **Outstanding from SPRINT-18:** Token-ledger SubagentStop attribution Red (BUG-024 diagnoses; CR-026 SPRINT-20 fix). 138KB Reporter bundle vs 80KB cap (CR-022 M5 raises to 160KB). Archive's wiki-lint hard-block (CR-022 M5 adds `--allow-wiki-lint-debt` flag). suggest_improvements.mjs naming sweep (CR-022 M0 helper + M6 consume). 34 wiki-lint broken-backlinks (deferred to SPRINT-20). Pre-existing admin/+mcp/ vitest failures (carried forward).

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** Wave 1 spawns 4 Developer agents in parallel (BUG-024, CR-022 M0, CR-024 S1, CR-025 S1). Each Developer reads its anchor file + the corresponding M0/M1/M2/M3 milestone plan from `.cleargate/sprint-runs/SPRINT-19/plans/`.
- **Relevant Context:** SDLC charter `.cleargate/scratch/SDLC_brainstorm.md` is the authoritative source for CR-022's high-level scope (§1.8 + §2.4). SPRINT-18 REPORT.md (`.cleargate/sprint-runs/SPRINT-18/SPRINT-18_REPORT.md`) supplies the lessons folded into CR-022. Three CR files (CR-022/024/025) + BUG-024 are the authoritative per-anchor sources.
- **Constraints:**
  - No CLAUDE.md changes outside CLEARGATE-tag-block region (live).
  - Mirror parity per-edit, not state-parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
  - Real infra, no mocks for test fixtures (FLASHCARD `2026-04-25 #qa #postgres`).
  - Vitest worker hygiene already fixed by CR-023's `pool: 'forks'` (SPRINT-18); inherits.
  - Token-ledger Red is OUT of scope for fixing in SPRINT-19. BUG-024 only diagnoses. Surface in §4 Execution Log if you observe attribution surprises, but do not implement.
  - DoD §4.1 test counts are ENFORCED, not advisory (SPRINT-18 lesson — three near-identical kickbacks). Each Developer ships tests in the same commit as the implementation.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — pending Gate 2 human ack**

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 4 anchor items decomposed and 🟢 (CR-022 + CR-024 + CR-025 + BUG-024).
- [x] Sprint Goal articulated (§0 Stakeholder Brief + §1 prelude).
- [x] Wave structure preview present (§1).
- [ ] Architect SDR populated §§2.1-2.5 (DEFERRED to post-approval; updates this section in-place before Gate 2).
- [x] Risks enumerated with mitigations (§3).
- [x] Token-ledger Red carry-forward strategy explicit (§3 + Execution Guidelines + §5 Outstanding).
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (post-approval). The CLI subcommand `cleargate sprint preflight SPRINT-19` exists (shipped by SPRINT-18 STORY-025-02); first sprint to use it from cold start.
