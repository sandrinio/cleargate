---
sprint_id: SPRINT-24
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-24
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Ready
execution_mode: v2
start_date: 2026-05-05
end_date: 2026-05-16
created_at: 2026-05-04T18:00:00Z
updated_at: 2026-05-04T13:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Sprint 3 of the SDLC Hardening multi-sprint roadmap (see
  `.cleargate/scratch/SDLC_hardening_continued.md`). SPRINT-22 landed
  the structural changes (TDD discipline + DevOps role + reporter doc
  fix); SPRINT-23 landed the cross-cutting tooling (Sprint Context File,
  run_script.sh wrapper, Mid-Sprint Triage rubric + TPV gate, orphan
  drift cleanup). SPRINT-24 is the cleanup-and-dogfood sprint: pay down
  the carry-over debt SPRINT-23's own dogfood surfaced, validate TPV
  in operation, and tighten the canonical-vs-live mirror story.

  Theme: "Tighten the loop" — the SPRINT-23 5-step loop (Architect →
  QA-Red → TPV → Dev → QA-Verify → Architect post-flight → DevOps merge)
  ran end-to-end on 4 parallel CRs, surfaced ONE Architect kickback
  (CR-046 wrapper rewrite broke 6 production callers; QA missed it
  because spawnMock-style tests masked the breakage), and dogfooded
  Step 2.6b orphan reconciler (found 10 historical orphans across
  SPRINT-16..SPRINT-21). The loop works. SPRINT-24 closes the gaps:

  - **CR-049 Canonical-vs-Live Drift Audit:** SPRINT-23 close session ran
    `cleargate init --force` to cure live `/.claude/` mirror drift but
    accidentally clobbered .gitignore + FLASHCARD.md + 4 scripts. Hotfix
    `f6dfe39` added FIRST_INSTALL_ONLY exemption (prevention layer);
    CR-049 reconciles the 4 known-divergent scripts (live → canonical)
    and adds a parity test (CI guard).

  - **CR-050 Path B Caller Migration:** CR-046 shipped the new
    arbitrary-cmd interface PLUS a back-compat shim (commit 763e7f7)
    when Architect post-flight found 6 production CLI callers passing
    `<script-name>.{mjs,sh}`. CR-050 retires the shim by migrating the
    6 callers to explicit `node` / `bash` + script path. Eliminates
    dual-interface debt.

  - **CR-051 DevOps Subagent Registration:** SPRINT-23 close found that
    the `devops` subagent_type was not registered in the Claude Code
    session even though `.claude/agents/devops.md` existed with proper
    frontmatter. Workaround: orchestrator-fallback inline DevOps.
    CR-051 investigates root cause + ships fix or documentation.

  - **CR-052 E2E Wrapper Test Helper:** CR-046 Architect kickback
    flashcarded the test pattern that caught the regression (copy
    wrapper to tmpdir + spawnSync). CR-052 promotes that pattern into
    a shared `test/helpers/wrap-script.ts` utility that CR-050 consumes.

  Plus passive validation: TPV (CR-047) becomes operational SPRINT-24.
  Track: did TPV catch ≥1 wiring gap across SPRINT-24's standard-lane
  stories? Metric in §5.

  Carry-over deferred to SPRINT-25:
  - run_script.sh self-repair (CR-046 §0.5 Q3, deferred from SPRINT-23)
  - run_script.sh UTF-8 byte-vs-char truncation
  - Skill creation candidate from improvement-suggestions.md (CR-045 ×
    architect pattern repeated ≥3×)

  Dogfood validation question for SPRINT-24 retrospective: did Path B
  migration + canonical drift fix prevent any new regressions? Goal-met
  signal for tighten-the-loop theme.
epics: []
stories: []
crs:
  - CR-049
  - CR-050
  - CR-051
  - CR-052
bugs: []
proposals: []
approved: true
approved_at: 2026-05-04T13:00:00Z
approved_by: human
human_override: false
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T13:58:59Z
stamp_error: no ledger rows for work_item_id SPRINT-24
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T13:58:59Z
  sessions: []
---

# SPRINT-24: Tighten the Loop — Carry-over Cleanup + TPV Dogfood

## 0. Stakeholder Brief

> Sponsor-readable summary.

- **Sprint Goal:** Close the gaps SPRINT-23's own dogfood surfaced. Reconcile canonical-vs-live drift for 4 known-divergent scripts + add parity CI guard (CR-049). Retire the run_script.sh back-compat shim by migrating 6 production CLI callers to the canonical arbitrary-cmd interface (CR-050). Investigate + fix DevOps subagent registration so future sprints don't need orchestrator-fallback (CR-051). Promote the wrapper-e2e test pattern into a shared helper (CR-052). Passive: dogfood TPV (CR-047) on standard-lane stories — track whether it catches ≥1 wiring gap.
- **Business Outcome:** Single canonical wrapper interface (no shim debt). Mirror parity drift caught by CI before next sprint kickoff (no surprise reverts). DevOps merge dispatches reliable (no orchestrator-fallback fragility). Test pattern that catches wrapper-interface regressions becomes reusable. Net expected impact on SPRINT-25+: lower mid-sprint surprise rate, faster sprint kickoffs (no manual canonical-cure), TPV gate operational.
- **Risks (top 3):**
  1. **CR-049 audit surfaces widespread canonical drift beyond the 4 known scripts.** If audit finds 15+ divergent files, CR-049 scope-cuts to the 4 known + audit-only report; widespread fix becomes a SPRINT-25 follow-up CR.
  2. **CR-051 root cause is "session caches at start", not a frontmatter bug.** Resolution becomes documentation-only; no agent fix possible. Mitigation: SKILL.md §A.1 preflight verifies devops subagent_type at sprint kickoff; halt + restart-session if missing.
  3. **CR-050 migration uncovers a 7th caller mid-sprint.** Migrate it inline; do not defer (back-compat shim cannot be deleted while any caller depends on it). Surface in §4 Execution Log.
- **Metrics:**
  - **Canonical drift:** post-CR-049, `diff cleargate-planning/.cleargate/scripts/* .cleargate/scripts/*` reports zero divergence for the 4 known files. Audit report lists any other divergence count.
  - **Shim removal:** post-CR-050, run_script.sh has zero back-compat extension-routing lines; LOC drops by ~15.
  - **TPV catch rate (passive):** SPRINT-24 has 3 standard-lane CRs (CR-049, CR-050, CR-052; CR-051 is investigation-heavy). Track: did TPV catch ≥1 wiring gap across these 3? If 0 catches, downgrade TPV to fast-lane-skip in SPRINT-25 (per CR-047 §0.5 Q4 follow-through).
  - **DevOps subagent reachability:** post-CR-051, `Agent(subagent_type=devops, prompt: "test")` succeeds in a fresh Claude Code session.
  - **Wrapper-e2e helper adoption:** post-CR-052, ≥1 consumer test file imports `wrapScript` from `test/helpers/wrap-script.ts`.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`CR-049`](CR-049_Canonical_Live_Drift_Audit.md) | CR | Canonical-vs-Live Drift Audit + Sync + CI Guard | standard | M | n (W1 alone) | low | W1 |
| [`CR-052`](CR-052_E2E_Wrapper_Test_Helper.md) | CR | E2E Wrapper Test Helper — `wrapScript()` | standard | S-M | y (W2 first) | low | W2 |
| [`CR-050`](CR-050_Run_Script_Path_B_Caller_Migration.md) | CR | run_script.sh Path B Caller Migration + Shim Removal | standard | M | n (W2 second; depends on CR-052) | med | W2 |
| [`CR-051`](CR-051_DevOps_Subagent_Registration.md) | CR | DevOps Subagent Registration — Investigation + Fix | standard | M | y (W2 parallel with CR-052/050) | med | W2 |

**Estimated totals:** 4 CRs across 2 waves. Complexity: 1×M + 1×S-M + 2×M. Lane mix: 4 standard. Parallelism: W1 = 1 (CR-049 alone, foundational); W2 = 3 (CR-052 → CR-050 sequential within W2; CR-051 parallel).

**Dispatch unit estimate:** 4 Architect M-plan + 4 QA-Red + 4 TPV (operational SPRINT-24) + 4 Dev + 4 QA-Verify + 4 Architect post-flight + 4 DevOps = **~28 dispatches**. Step-up vs SPRINT-23's 24 explained by TPV becoming operational (4 dispatches; was self-validation paradox in SPRINT-23 = 0 dispatches).

## 2. Execution Strategy

### 2.1 Phase Plan (preliminary — Architect SDR finalizes)

**Wave 1 — CR-049 alone (foundational):**
- CR-049 reconciles canonical = live for 4 scripts + adds parity test. Lands first so subsequent CRs develop against a clean baseline.

**Wave 2 — CR-052 → CR-050 sequential, CR-051 parallel:**
- CR-052 ships `test/helpers/wrap-script.ts` first (CR-050 consumes it).
- CR-050 follows; migrates 6 callers + deletes shim + uses helper.
- CR-051 runs parallel with CR-052/050; investigation + fix on a separate file surface (devops.md + SKILL.md).

→ **TPV operational on all 4 standard-lane CRs.** First sprint where TPV runs in the loop. Per CR-047 self-validation paradox closed; orchestrator must explicitly invoke `--arch-bounce` on Mode:TPV BLOCKED-WIRING-GAP.

### 2.2 Merge Ordering (preliminary — Architect SDR pins line ranges)

| Shared File | Items | Merge Order | Rationale |
| --- | --- | --- | --- |
| `cleargate-planning/.cleargate/scripts/run_script.sh` | CR-050 only | n/a | Single-CR (CR-050 deletes shim block). |
| `cleargate-planning/.cleargate/scripts/*` (4 known-divergent) | CR-049 only | n/a | Single-CR (CR-049 reconciles live → canonical). |
| `cleargate-planning/.claude/agents/devops.md` | CR-051 only | n/a | Single-CR (CR-051 fixes frontmatter if needed). |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | CR-051 only | n/a | Single-CR (CR-051 §1 Agent Roster + §C.7 escape hatch + §A.1 preflight). |
| `cleargate-cli/test/helpers/wrap-script.ts` | CR-052 only (NEW) + CR-050 imports | sequential | CR-052 lands first; CR-050 imports the helper. |
| `cleargate-cli/src/commands/{sprint,state,gate}.ts` | CR-050 only | n/a | Single-CR (CR-050 migrates 6 invocations). |

### 2.3 Shared-Surface Warnings (preliminary)

- **CR-052 → CR-050 sequencing is load-bearing.** If CR-050 lands before CR-052, CR-050 has to inline tmpdir-spawnSync logic into 3 test files (duplication). Architect M1 plan must enforce the ordering.
- **CR-049 audit may surface drift beyond the 4 known scripts.** Scope-cut rule: CR-049 fixes the 4 known + audit-only report for everything else. If audit shows widespread drift (15+ files), surface for SPRINT-25 fix CR.
- **CR-050's shim deletion is irreversible mid-sprint.** Once the back-compat block is removed, any pre-existing caller that hasn't been migrated will return 127 (executable not found on PATH). Search ENTIRE worktree for `run_script.sh.*\.(mjs|sh)` regex before shipping CR-050.
- **CR-051's investigation may scope-cut the CR.** If root cause = session-cache (not a frontmatter bug), the CR ships SKILL.md docs only — no devops.md change. M1 plan budgets for both outcomes.

### 2.4 Lane Audit (preliminary)

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| CR-049 | standard | Multi-file edit (4 scripts + new test) + audit report; not fast |
| CR-050 | standard | 6 caller migrations + shim deletion + 3 test refactors + 2 docs |
| CR-051 | standard | Investigation + multi-file edit (devops.md + SKILL.md + new test) |
| CR-052 | standard | New helper + meta-tests + 1 consumer refactor |

### 2.5 ADR-Conflict Flags (preliminary — Architect SDR finalizes)

- **None blocking.** SPRINT-24 lives within established invariants. The test-helper pattern (CR-052) is additive; the canonical-drift fix (CR-049) reconciles toward the documented mirror invariant.
- **Soft flag 1 — TPV operational dogfood paradox:** SPRINT-23 shipped TPV but didn't run it. SPRINT-24 is the first sprint where TPV runs. If TPV mis-fires (e.g., flags valid Red tests as wiring-gap), surface to human; do not let dogfood paradox stall the merge. Track in §5 metrics.
- **Soft flag 2 — orchestrator-fallback DevOps may persist.** If CR-051 root cause is session-cache and SPRINT-24 is the sprint that discovers it, the FIRST few CRs of SPRINT-24 may still need orchestrator-fallback. Document explicitly per CR-051 §0.5 Q4.

## 3. Risks & Dependencies

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| CR-049 audit finds widespread drift | Medium | Scope-cut to 4 known + audit-only report. |
| CR-051 root cause is session-cache (no fix possible) | Medium | Document constraint + escape hatch. SPRINT-24 still ships SKILL.md docs. |
| CR-050 finds 7th caller | Low-Medium | Migrate inline; do not defer. Halt sprint if 10+ unexpected callers. |
| TPV mis-fires on its own first sprint | Low | Surface to human; downgrade to advisory if mis-fire rate >25%. |
| Step 2.6b orphan reconciler regresses | Low | Already exercised at SPRINT-23 close; CR-049 parity test guards against canonical drift that could regress. |

## 4. Execution Log

(populated during sprint)

## 5. Metrics & Metadata

(populated at sprint close — see §0 Brief metrics list)

## Execution Guidelines (Local Annotation — Not Pushed)

- All 4 CRs run under SPRINT-23's shipped 5-step loop + TPV operational.
- DevOps merges sequential per §2.2.
- Mirror parity audit at every DevOps merge; CR-049's parity test catches drift in CI.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Yellow — Awaiting human review of Brief**

- [x] §0 Stakeholder Brief written (goal, outcome, top-3 risks, metrics).
- [x] §1 Consolidated Deliverables table populated (4 CRs).
- [x] §2 Execution Strategy populated preliminary (Architect SDR finalizes at kickoff).
- [x] §3 Risks & Dependencies surfaced (5 rows).
- [x] All 4 anchor CRs drafted in pending-sync/ with §0.5 Open Questions.
- [ ] Human approves Brief + Open Questions (or overrides).
- [ ] Status flips Draft → Ready, approved: true.
- [ ] Architect SDR pre-confirm at sprint kickoff (Phase A.4).

---
