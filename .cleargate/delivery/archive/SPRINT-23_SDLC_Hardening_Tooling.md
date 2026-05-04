---
sprint_id: SPRINT-23
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-23
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Completed
execution_mode: v2
start_date: 2026-05-05
end_date: 2026-05-16
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:30:00Z
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
approved: true
approved_at: 2026-05-04T10:30:00Z
approved_by: human
human_override: false
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T13:04:18Z
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-4-7
  last_stamp: 2026-05-04T11:01:57Z
  sessions:
    - session: 48aa90c9-f20f-4899-ba85-1079373f3d8e
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-04T10:59:22Z
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
| [`CR-048`](CR-048_Sprint_21_Orphan_Drift_Cleanup.md) | CR | SPRINT-21 orphan drift cleanup + reconciler hardening | standard | M | y (W1 parallel) | low | W1 |

**Estimated totals:** 4 items, 1 wave. Complexity: 4×M(~M-L). Lane mix: 4 standard (CR-048 upgraded from preliminary fast at SDR §2.4). Parallelism: W1 = 4 parallel dispatches.

**Dispatch unit estimate (post-SDR §2.4 lane re-audit):** 4 Architect M1 SDR/M-plan + 4 QA-Red dispatches (all standard lane) + 4 Dev dispatches + 4 QA-Verify dispatches + 4 Architect post-flights + 4 DevOps dispatches. Total **24 dispatches** in this sprint (was 22 pre-CR-048-upgrade) vs SPRINT-22's ~12. Step-up explained: TPV adds 3 dispatches (one per standard-lane CR via CR-047's own gate); DevOps adds 4 (one per CR per CR-044); CR-048 upgrade adds 2 (its own QA-Red + Architect post-flight). Cost discipline holds because each dispatch is bounded.

## 2. Execution Strategy

### 2.1 Phase Plan (FINAL)

**Wave 1 — Four parallel dispatches.** No hot-file conflict serializes within W1 (all SKILL.md / agent-prompt edits are insert-only at distinct anchor points; merge order is solved post-Dev by DevOps per §2.2, not pre-Dev). Architect M1 plans + QA-Red + Dev all run concurrently. **Merge** is sequential per §2.2.

| Item | What it produces | Sprint-Goal Advancement |
|---|---|---|
| **CR-045** | `.cleargate/sprint-runs/<id>/sprint-context.md` written at kickoff via extended `init_sprint.mjs`; every agent prompt has Preflight section instructing Read | _Goal clause 1: "cross-cutting sprint rules propagate to every dispatch via a single file."_ Direct delivery — orchestrator dispatch boilerplate moves into the file; preflight reads enforce honoring it. |
| **CR-046** | NEW `.cleargate/scripts/run_script.sh` wrapper + `cleargate-cli/src/lib/script-incident.ts` schema; SKILL.md §C dispatch contracts mandate wrapper for agent script calls | _Goal clause 2: "script failures become structured incident reports instead of raw bash output."_ Direct delivery — wrapper writes `.script-incidents/<ts>-<hash>.json`; Reporter aggregates into REPORT.md §Risks Materialized. |
| **CR-047** | NEW `.cleargate/knowledge/mid-sprint-triage-rubric.md` + `cleargate-cli/src/lib/triage-classifier.ts` + Architect `Mode: TPV` contract + SKILL.md NEW §C.10 + §C.3-sequence amendment | _Goal clause 3: "mid-sprint user input has deterministic Bug/Clarification/Scope/Approach routing."_ Direct delivery — 4-class rubric + classifier + TPV gate insertion between QA-Red and Dev. |
| **CR-048** | 8 SPRINT-21 orphans archived (status flip Ready→Done + file move) + `cleargate-cli/src/lib/lifecycle-reconcile.ts` extended with cross-sprint orphan rule | _Goal clause 4: "lifecycle reconciler catches cross-sprint orphan drift that SPRINT-21's close missed."_ Direct delivery — mechanical sweep cleans current pending-sync; reconciler extension prevents recurrence. |

→ Four parallel Developer dispatches under the SPRINT-22 5-step loop (Architect M1 → QA-Red → Dev → QA-Verify → Architect post-flight + DevOps merge). **All four CRs are standard lane post-§2.4 audit** (CR-048 upgraded from preliminary fast — see §2.4); QA-Red runs for all 4; Architect post-flight runs for all 4.

### 2.2 Merge Ordering (FINAL — pinned line ranges)

The four CRs touch four distinct surface families. Three are shared (SKILL.md, the 5 agent prompts); two are single-CR (init_sprint.mjs by CR-045; lifecycle-reconcile.ts by CR-048). Merge order **CR-045 → CR-046 → CR-047 → CR-048** is preserved across all shared surfaces (CR-048 last because it's the only one not touching SKILL.md / agent prompts and depends on no shared surface — it can also merge first opportunistically; orchestrator's choice).

| Shared File | Live-line baseline (count) | CR-045 insert | CR-046 insert | CR-047 insert | Merge Order | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | 553 lines | (a) §A.3 body L142–148: extend prose to document `init_sprint.mjs` writes `sprint-context.md`. (b) §B body L172–183: append "Preflight reads `sprint-context.md`" to dispatch contract. (c) §C.3 dispatch prompt block L223–225: cite preflight rule in Mode:RED contract. (d) §C.4 prompt block L248–254: add "Read sprint-context.md" to Developer inputs list. (e) §C.5 prompt block L276 + §C.6 L296–301 + §E.2 L448–469: same preflight injection. | (a) §C dispatch contracts: amend §C.3 (L223–225), §C.4 (L242–254), §C.5 (L270–286), §C.6 (L292–301) to add wrapper-mandatory rule; mandate `bash .cleargate/scripts/run_script.sh ...` for any script invocation in dispatch text. (b) Optional new §C.x "Script Invocation Contract" sub-section appended after §C.10 (post-CR-047 renumber → §C.11). | (a) NEW §C.10 "Mid-Sprint Triage" — insert at current L400 position, BEFORE existing §C.10 "Mid-cycle User Input" (existing §C.10 L400–414 RENUMBERS to §C.11). Insert ~30–50 lines covering rubric reference + classifier output usage + bounce-counter rules. (b) §C.3 sequence amendment at L188 (Phase C intro): add "TPV (Test Pattern Validation) → " between "QA-Red" and "Developer". (c) Add NEW §C.3.5 "TPV Gate" (Architect-only) between current §C.3 (L217–240) and §C.4 (L242). | **CR-045 → CR-046 → CR-047** | CR-045's edits are leaf-prose additions (no header insert, no renumber). CR-046 adds one optional new §C.x AFTER §C.10. CR-047 inserts NEW header §C.10 and renumbers existing §C.10 → §C.11; if CR-046 lands first, CR-047 adjusts its §C.x reference to §C.12. **Architect M1 plans MUST cite the post-merge line numbers their CR sees** — if CR-045 lands first (delta +~10 lines), CR-046's M1 must re-read SKILL.md before pinning its diff. CR-048 untouched. |
| `cleargate-planning/.claude/agents/architect.md` | 177 lines | NEW "Preflight" section: insert as a NEW `## Preflight` between L8 (role-prefix line) and L10 (`## Your one job`). ~6 lines. | NEW "Script Invocation" section: insert after the existing `## Lane Classification` (L122–144) and BEFORE `## Pre-Spec Dep Version Check (CR-037)` (L146). ~8 lines. | NEW `## Mode: TPV` section (or extend `## Sprint Design Review` L68–88 with a TPV-mode subsection). Recommend NEW top-level `## Mode: TPV` inserted AFTER `## Sprint Design Review` (L88) and BEFORE `## Protocol Numbering Resolver` (L90). ~15–20 lines covering wiring-check rubric + APPROVED / BLOCKED-WIRING-GAP output. | **CR-045 → CR-046 → CR-047** | Three additive sections at distinct anchors (L8, L122/146 boundary, L88/90 boundary). Each later CR re-reads to pin post-merge line numbers. |
| `cleargate-planning/.claude/agents/qa.md` | 141 lines | NEW `## Preflight` section: insert between L8 (role-prefix) and L10 (`## Capability Surface`). ~6 lines. | NEW `## Script Invocation` section: insert after `## Guardrails` (L131–137) and BEFORE `## What you are NOT` (L138). ~8 lines. | Extend existing `## Mode Dispatch — Red vs Verify` (L21–50) — append a new bullet under **Mode: RED** (after L34, "Forbidden:" line) declaring "Tests must be wiring-sound for Architect TPV approval; gap routing returns to QA-Red". ~3 lines. | **CR-045 → CR-046 → CR-047** | Same pattern as architect.md. |
| `cleargate-planning/.claude/agents/developer.md` | 164 lines | NEW `## Preflight` section: insert between L8 (role-prefix) and L10 (`## Your one job`). ~6 lines. | NEW `## Script Invocation` section: insert after `## Inner-loop test runner` (L69–77) and BEFORE `## Guardrails` (L79). ~8 lines. | (no edit) | **CR-045 → CR-046** | CR-047 doesn't touch developer.md. |
| `cleargate-planning/.claude/agents/devops.md` | 240 lines | NEW `## Preflight` section: insert between L8 (role-prefix) and L10 (`## Your one job`). ~6 lines. | NEW `## Script Invocation` section: insert after `## Boundaries` (L220–227) and BEFORE `## Guardrails` (L229). ~8 lines. | (no edit) | **CR-045 → CR-046** | CR-047 doesn't touch devops.md. |
| `cleargate-planning/.claude/agents/reporter.md` | 232 lines | NEW `## Preflight` section: insert between L8 (role-prefix) and L10 (`## Capability Surface`). ~6 lines. | EXTEND existing prompt — append to `## Workflow` (L42–89) a new step instructing Reporter to aggregate `## Script Incidents` sections from agent reports into REPORT.md §Risks Materialized. ~5 lines, anchored just before line 91 (`## v2-adoption note`). | (no edit) | **CR-045 → CR-046** | CR-047 doesn't touch reporter.md. |
| `.cleargate/scripts/init_sprint.mjs` | 195 lines | EXTEND `main()` (L104–195). After state.json is written (after `process.stdout.write` at L192), add a new block: read the sprint frontmatter at `sprintFilePath` (already located by `findSprintFile()` at L132), extract sprint goal from §0 + active-CR list, copy `.cleargate/templates/sprint_context.md` (42 lines, frontmatter + 4 sections) to `<sprintDir>/sprint-context.md`, substituting `sprint_id`, `created_at`, `last_updated`. Net add ~30–40 LOC. | (no edit) | (no edit) | n/a | Single-CR edit. CR-045 only. |
| `cleargate-cli/src/lib/lifecycle-reconcile.ts` | 548 lines | (no edit) | (no edit) | (no edit) | n/a | Single-CR edit (CR-048). Extension lands in/near `reconcileLifecycle()` (L232–358). New rule: scan `pending-sync/` for items with `status: Ready` AND check across all closed `sprint-runs/*/state.json` for matching `state: Done`; if found → emit a DriftItem with reason `cross-sprint-orphan`. Net add ~50 LOC + new helper for state.json scanning. |
| `.cleargate/templates/sprint_context.md` | 42 lines | VERIFY/EXTEND existing template — current schema has `Locked Versions` / `Cross-Cutting Rules` / `Active FLASHCARD Tags` / `Adjacent Implementations`. CR-045 §0.5 Q4 proposes `Sprint Goal` / `Cross-Cutting Rules` / `Active CRs` / `Mid-Sprint Amendments`. **Mismatch — Architect M1 must reconcile.** Either: (a) keep existing 4 sections + add `Sprint Goal` (frontmatter or new top section) + `Mid-Sprint Amendments` (append-only); or (b) restructure to CR-045's proposed schema. M1 plan picks (a) as additive-safe; verify via Brief if (b) is preferred. | (no edit) | (no edit) | n/a | Single-CR edit. CR-045 only. |

**Test surface additions (NEW, no merge collision — distinct files):**
- CR-045: `cleargate-cli/test/scripts/init-sprint-context.node.test.ts` (3 scenarios). QA-Red writes as `*.red.node.test.ts`.
- CR-046: `cleargate-cli/test/scripts/run-script-wrapper.node.test.ts` (5 scenarios). QA-Red writes as `*.red.node.test.ts`.
- CR-047: `cleargate-cli/test/lib/triage-classifier.node.test.ts` (8 scenarios) + `cleargate-cli/test/scripts/tpv-architect.node.test.ts` (4 scenarios). QA-Red writes both as `*.red.node.test.ts`.
- CR-048: `cleargate-cli/test/lib/lifecycle-reconciler-orphan.node.test.ts` (4 scenarios). QA-Red writes as `*.red.node.test.ts`.

### 2.3 Shared-Surface Warnings (FINAL — confirmed + extended)

- **SKILL.md §C renumbering hazard (HIGH).** CR-047 inserts NEW §C.10 BEFORE existing §C.10 "Mid-cycle User Input" (L400–414), forcing existing §C.10 → §C.11. Combined with CR-046's optional new §C.x append, post-CR-047 line numbers shift by ~30–50 lines. **Mitigation:** DevOps merges CR-045 → CR-046 → CR-047 sequentially, each CR's M1 plan re-reads SKILL.md after the prior CR merges and re-pins its diff against current line numbers. CR-046 author MUST re-pin §C-dispatch-contract line numbers post-CR-045-merge (delta +~10 lines from CR-045's leaf inserts).
- **Agent prompt cumulative growth (MEDIUM).** Five agent prompts each gain +1–3 NEW sections from CR-045/046/047. Post-merge sizes: architect.md 177→~205, qa.md 141→~160, developer.md 164→~178, devops.md 240→~254, reporter.md 232→~243. None cross 500-line condensation threshold per SPRINT-22 retrospective. No SPRINT-24 condensation CR needed; revisit at SPRINT-24 close.
- **CR-046 wrapper invocation order paradox (LOW but real).** SKILL.md §C dispatch contracts (CR-046's main edit) instruct agents to invoke scripts via `run_script.sh`. But the wrapper script ITSELF lives at `.cleargate/scripts/run_script.sh` — invoking it does not require the wrapper. Document explicitly in CR-046's SKILL.md text: "the wrapper is exempt from wrapping itself; orchestrator-direct invocation of run_script.sh is the canonical entry point."
- **CR-047 TPV bounce-counter semantics conflict with CR-043's qa_bounces (LOW).** CR-047 §0.5 Q4 specifies TPV gaps increment `arch_bounces` only (not qa_bounces). The `update_state.mjs` script needs a TPV-bounce path; if it doesn't already accept a generic `--arch-bounce` flag, CR-047's M1 plan must include a state-machine extension OR Architect surfaces an open decision. Verify in M1.
- **CR-045 + CR-047's overlapping mid-sprint-amendment surface (LOW).** CR-045 §0.5 Q2 says "Architect can update sprint-context.md mid-sprint on CR:scope-change or CR:approach-change." CR-047's triage rubric defines those CR classes. The integration is implicit: CR-045's Architect mid-sprint amendment IS the action that the CR-047 rubric routes "approach-change" into. Document the link in CR-047's knowledge doc.
- **CR-048 mechanical archive temporarily breaks wiki ingest (LOW).** Eight `.cleargate/delivery/pending-sync/CR-{031,032,033,034,035,037,038,039}_*.md` files move to `archive/`. PostToolUse wiki-ingest hook will re-ingest from archive paths on next edit; sprint-close wiki rebuild handles it. No code change needed.
- **`.script-incidents/` directory tracking decision (LOW).** CR-046 §2 says TRACK incident JSONs (sprint history value). Confirm: add `!.script-incidents/` to `.gitignore` if `.cleargate/sprint-runs/` is otherwise gitignored (verify), OR ensure tracking is not blocked by a parent `.gitignore` rule. M1 plan must verify.
- **Dogfood loop validation (META — NOT a conflict, but a sprint-level risk).** SPRINT-23 is the first dogfood validation of the SPRINT-22 5-step loop on 4 parallel CRs. CR-047's TPV gate is itself being validated by being executed. If TPV mis-fires on CR-047's own QA-Red tests (paradox: TPV reviews TPV-test wiring), surface to human; do not let the validation paradox stall the merge.

### 2.4 Lane Audit (FINAL)

Lane rubric per `.cleargate/knowledge/cleargate-enforcement.md` §9 (7 checks; ALL must pass for fast):

| Item | Lane | Rubric outcome | Rationale (≤80 chars) |
| --- | --- | --- | --- |
| CR-045 | **standard** | Fails #1 (size, ~9 files), #4 (4 acceptance criteria) | Multi-surface: init_sprint + SKILL + 5 agent prompts + 1 test |
| CR-046 | **standard** | Fails #1 (size, ~8 files + NEW dir), #4 (7 acceptance criteria) | NEW wrapper + schema + SKILL + 5 agent prompts + 1 test |
| CR-047 | **standard** | Fails #1 (size, ~7 files), #4 (8 acceptance criteria), #6 (med exposure per CR §0.5 Q4) | NEW knowledge + classifier + SKILL §C.10 + 2 prompts + 2 tests |
| CR-048 | **standard** | Fails #1 (size, 10 files: 8 archive + 1 lib + 1 test), #4 (6 acceptance criteria), #7 (touches lib + delivery tree) | **UPGRADED from preliminary fast.** Reconciler extension + 8-file mechanical sweep + new test exceeds fast-lane scope. |

**CR-048 lane upgrade rationale:** Preliminary §2.4 marked CR-048 as fast. Re-audit applies the 7-check rubric strictly:
- **#1 size cap (≤2 files, ≤50 LOC net):** FAIL — 8 file moves + 8 frontmatter status flips + 1 lib edit + 1 NEW test = 10+ files.
- **#4 single acceptance scenario:** FAIL — 6 acceptance criteria + 4 distinct test scenarios in the new red test.
- **#7 single-subsystem scope:** FAIL — touches both `cleargate-cli/src/lib/` (code) AND `.cleargate/delivery/` (delivery tree).

Three failures = standard lane mandatory. CR-048 gets QA-Red (Red test for the new orphan-detection rule) and Architect post-flight (mechanical sweep + lib extension warrants review). Cost delta: +1 QA-Red dispatch + +1 Architect post-flight = ~2 dispatches (~5 minutes Architect + ~5 minutes QA-Red). Acceptable.

**Updated dispatch unit estimate (revised from §1):** 4 Architect M1 + 4 QA-Red (was 3) + 4 Dev + 4 QA-Verify + 4 Architect post-flight (was 3) + 4 DevOps = **24 dispatches** (was 22). Step-up of 2 dispatches due to CR-048 lane upgrade.

### 2.5 ADR-Conflict Flags (FINAL — 4 soft flags)

- **No blocking ADR conflict.** SPRINT-23's design lives within established invariants (mirror-parity per FLASHCARD `#mirror`, file-surface contract per cleargate-enforcement.md §20, real-infra-no-mocks per CLAUDE.md, archive-immutability §11.4, npm-test-routes-to-node-test per FLASHCARD 2026-05-04 `#npm-test`).
- **Soft flag 1 — `.script-incidents/` lifecycle (CR-046 + CR-048 interaction).** CR-046 introduces `.cleargate/sprint-runs/<id>/.script-incidents/<ts>-<hash>.json` files. CR-048's reconciler extension scans `pending-sync/` for `status: Ready` items with state `Done` in closed sprints. The reconciler must NOT scan `.script-incidents/` (those are sprint-run artifacts, not delivery items). M1 plan for CR-048 must explicitly limit scan scope to `delivery/pending-sync/*.md` matching the artifact ID pattern. Documented in CR-048 acceptance #4 ("no false-positive on archived items") but extending to script-incidents is implicit; flag for M1.
- **Soft flag 2 — TPV gate token economics (CR-047).** TPV adds 1 Architect dispatch per standard-lane story. SPRINT-23's revised estimate is 24 dispatches; SPRINT-22 was ~12. The 2× step-up is partly TPV (3 dispatches), partly DevOps role addition (4 dispatches). Reporter must aggregate per-Architect-dispatch token cost in REPORT.md §3 Execution Metrics; if TPV dispatches ≥1.5× a typical Architect M1 dispatch, flag for SPRINT-24 review. Tracked via CR-047 acceptance #6 (TPV catches a wiring gap) — if 0 catches in SPRINT-23+24, downgrade to advisory.
- **Soft flag 3 — Sprint Context File schema drift (CR-045).** Existing `.cleargate/templates/sprint_context.md` (42 lines) has `Locked Versions / Cross-Cutting Rules / Active FLASHCARD Tags / Adjacent Implementations`. CR-045 §0.5 Q4 proposes `Sprint Goal / Cross-Cutting Rules / Active CRs / Mid-Sprint Amendments`. The schemas are different. M1 plan default: keep existing 4 sections AS-IS, ADD `Sprint Goal` (top of body) + `Mid-Sprint Amendments` (bottom, append-only). Resolve via Brief if a clean restructure is preferred; the additive path is safer given downstream agent-prompt references could break on a rename.
- **Soft flag 4 — `update_state.mjs` arch-bounce flag for TPV (CR-047).** CR-047 §2 says "verify state machine accommodates TPV bounce (likely uses existing arch_bounces counter; no schema change needed)." Verify: grep `update_state.mjs` for `--arch-bounce`. If absent, CR-047's M1 must include a state-script extension OR document that TPV reuses an existing flag. Architect M1 raises as open decision if ambiguous.

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| CR-047 TPV adds dispatches without catching defects | Acceptance #6 covers 4 wiring-gap scenarios; SPRINT-24 retrospective tracks miss-rate; downgrade to advisory if 0 catches |
| CR-045 Sprint Context File becomes write-only | Acceptance #3 mandates Preflight section in every agent prompt explicitly Reading the file; reporter signal |
| CR-046 wrapper adopted unevenly | SKILL.md mandates wrapper for Dev/QA/Architect/DevOps; SPRINT-24 audit |
| CR-048 archive breaks wiki ingest | Wiki rebuild at sprint close re-ingests from archive paths |
| 4-CR sprint width with 24-dispatch estimate | Acceptable — each dispatch bounded; new 5-step loop's per-dispatch cost is lower than pre-SPRINT-22; if any dispatch >2× wall-clock budget, surface to human |
| Live `.claude/` re-sync forgotten post-merge | Add to `.doc-refresh-checklist.md` at sprint close: "After CR-045/046/047/048 merge, re-sync live via cleargate init or hand-port qa.md + 4 other agents + SKILL.md + run_script.sh + lifecycle-reconcile.ts" |
| Mid-sprint user feedback restructures plan | CR-047's own rubric is the answer. Use it self-referentially — first instance of "the formal triage" is when SPRINT-23 itself faces mid-sprint input |
| CR-048 lane upgrade adds 2 dispatches | Accepted at SDR §2.4 — net cost ~10min; benefit: Architect post-flight reviews reconciler extension before merge (regression-prevention worth the cost) |

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

- **Starting Point:** This sprint runs UNDER the new SPRINT-22 5-step loop (Architect → QA-Red → Dev → QA-Verify → Architect post-flight → DevOps). It's the first dogfood validation of the loop. **All 4 CRs are standard lane** (CR-048 upgraded from preliminary fast at SDR §2.4).
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
- [x] **Architect SDR** populates §§2.1-2.5 with line-range stencils (FINAL — completed by Architect SDR 2026-05-04; CR-048 lane upgraded fast → standard).
- [x] Risks enumerated with mitigations (§3 — 8 items).
- [ ] **All anchors at 🟢:** currently 🟡 (each anchor has §0.5 Open Questions awaiting Brief review in next session).
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (next session).
