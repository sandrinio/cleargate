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
  last_gate_check: 2026-05-04T14:06:43Z
stamp_error: no ledger rows for work_item_id SPRINT-24
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T14:06:43Z
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

### 2.1 Phase Plan (FINALIZED — Architect SDR 2026-05-04)

**Wave 1 — CR-049 alone (foundational):**
- CR-049 reconciles canonical = live for 4 named scripts (write_dispatch.sh, validate_state.mjs, test/test_flashcard_gate.sh, test/test_test_ratchet.sh) and adds `cleargate-cli/test/scaffold/canonical-live-parity.node.test.ts` (6 scenarios). Lands first so subsequent CRs develop against a clean canonical=live baseline.
- **Goal-clause delivery:** "Reconcile canonical-vs-live drift for 4 known-divergent scripts + add parity CI guard."

**Wave 2 — CR-052 → CR-050 strictly sequential; CR-051 parallel:**
- **CR-052 first** (W2-A): ships `cleargate-cli/test/helpers/wrap-script.ts` + `cleargate-cli/test/helpers/wrap-script.node.test.ts` (4 meta-scenarios) + refactors `run-script-wrapper-backcompat.node.test.ts` as proof-of-consumer. Lands before CR-050 because CR-050's 3 caller-test refactors import the helper.
  - **Goal-clause delivery:** "Promote the wrapper-e2e test pattern into a shared helper."
- **CR-050 second** (W2-B): migrates 8 production callers (see §2.3 — story.ts adds 2 sites beyond the named 6) + deletes shim block (~15 LOC) + deletes companion test + refactors 3 caller test files using CR-052 helper. Hard ordering: starts only after CR-052 merges to sprint branch.
  - **Goal-clause delivery:** "Retire the run_script.sh back-compat shim by migrating production CLI callers to the canonical arbitrary-cmd interface."
- **CR-051 parallel** (W2-C): investigation (≤30 min) on `devops.md` frontmatter + Claude Code agent-registry behaviour, then either frontmatter fix or docs-only patch. Touches `.claude/agents/devops.md` + `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (§1, §A.1, §C.7) + new test. Disjoint file surface from CR-050/052 → safe to run concurrently with W2-B.
  - **Goal-clause delivery:** "Investigate + fix DevOps subagent registration so future sprints don't need orchestrator-fallback."

**TPV operational on all 4 CRs.** First sprint where TPV runs in the loop. Per FLASHCARD 2026-05-04 `#tpv #self-validation`, orchestrator must explicitly invoke `node update_state.mjs <id> --arch-bounce` on Mode:TPV BLOCKED-WIRING-GAP — no auto-increment from Mode:TPV return.

**Goal-advancement check:** every CR maps to one explicit goal clause; no scope outside the goal. Passive metric (TPV catch rate ≥1) is tracked across CR-049, CR-050, CR-052 per §0 metrics.

### 2.2 Merge Ordering (FINALIZED — Architect SDR 2026-05-04)

| Shared File | Items | Pinned Lines / Block | Merge Order | Rationale |
| --- | --- | --- | --- | --- |
| `cleargate-planning/.cleargate/scripts/{write_dispatch.sh, validate_state.mjs, test/test_flashcard_gate.sh, test/test_test_ratchet.sh}` | CR-049 only | full-file replace from live | n/a (W1) | Single-CR (CR-049 reconciles live → canonical, byte-identical post-merge). |
| `cleargate-cli/test/scaffold/canonical-live-parity.node.test.ts` | CR-049 only | NEW file, ≥6 scenarios | n/a (W1) | Single-CR; new file. |
| `cleargate-cli/test/helpers/wrap-script.ts` | CR-052 (NEW) → CR-050 (imports) | NEW ~80 LOC + import-only in CR-050 | sequential — CR-052 lands first | CR-050's caller-test migration imports the helper. CR-050 starts only after CR-052 sprint-branch merge. |
| `cleargate-cli/test/helpers/wrap-script.node.test.ts` | CR-052 only | NEW file, 4 meta-scenarios | n/a (W2-A) | Single-CR; new file. |
| `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` | CR-052 (refactor) → CR-050 (delete) | full file | sequential | CR-052 refactors as proof-of-consumer; CR-050 then deletes it (companion to shim removal). |
| `cleargate-cli/src/commands/sprint.ts` | CR-050 only | L233-251 (init), L275-292 (close), and `args` arrays at L235, L277 | n/a (W2-B) | Single-CR; 2 invocations migrate from `[runScript, '<name>.mjs', ...]` to `[runScript, 'node', '<path>.mjs', ...]`. |
| `cleargate-cli/src/commands/state.ts` | CR-050 only | L83-103 (update), L126-148 (validate); spawnFn at L85, L128 | n/a (W2-B) | Single-CR; 2 invocations. |
| `cleargate-cli/src/commands/gate.ts` | CR-050 only | L395-435 (qa), L437-476 (arch); spawnFn at L418, L460 | n/a (W2-B) | Single-CR; 2 invocations. Both pass `pre_gate_runner.sh` → migrate to `bash` + path. |
| **`cleargate-cli/src/commands/story.ts`** (NEW IN SCOPE) | CR-050 only | L149-165 (step2 Bouncing), L329-345 (step6 Done); spawnFn at L151, L331 | n/a (W2-B) | **7th + 8th callers — see §2.3 warning. Both pass `'update_state.mjs'` as arg-2 (shim form). Must migrate to `node` + path or shim deletion will return 127.** |
| `cleargate-planning/.cleargate/scripts/run_script.sh` + `.cleargate/scripts/run_script.sh` | CR-050 only | shim block (~15 LOC, commit 763e7f7) | n/a (W2-B) | Single-CR; live ↔ canonical edited together (currently byte-identical, 224 LOC each). |
| `cleargate-planning/.claude/agents/devops.md` + `.claude/agents/devops.md` | CR-051 only | frontmatter (`name:`, `model:`, `tools:`) if delta vs qa.md/developer.md | n/a (W2-C) | Single-CR; possibly no edit if root cause = session-cache. |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | CR-051 only | §1 Agent Roster (L56) +3 lines, §A.1 preflight (L112) +1 check, §C.7 Story Merge (L349) +escape-hatch subsection ≤10 lines | n/a (W2-C) | Single-CR. Three disjoint sections; no collision risk with any other SPRINT-24 CR. |
| `cleargate-cli/test/scaffold/devops-agent-registration.node.test.ts` | CR-051 only | NEW file, 3 scenarios | n/a (W2-C) | Single-CR; new file. |

**Cross-CR merge order:** CR-049 → CR-052 → CR-050; CR-051 may merge any time after CR-049 (independent surface). Recommended: CR-051 merges between CR-052 and CR-050 to free DevOps subagent for CR-050's DevOps step if CR-051 ships a frontmatter fix.

### 2.3 Shared-Surface Warnings (FINALIZED — Architect SDR 2026-05-04)

- **CR-052 → CR-050 sequencing is load-bearing.** If CR-050 lands before CR-052, CR-050 must inline tmpdir-spawnSync logic into 4 test files (3 caller tests + the existing backcompat test). Architect M-plan for CR-050 must enforce the import. **Mitigation:** CR-050 dispatch is gated on CR-052 sprint-branch merge.
- **CR-050 scope is 8 callers, not 6 (NEW finding).** SDR grep found 2 additional shim-form invocations in `cleargate-cli/src/commands/story.ts` L151 + L331 — both pass `bash run_script.sh update_state.mjs <id> <state>`. CR-050 §0.5 Q5 already authorizes inline migration of the 7th caller; this finding extends to the 8th. **Mitigation:** Architect M-plan for CR-050 must explicitly include `story.ts` as a 4th file in the migration list and update §3 Execution Sandbox accordingly. Test surface grows by `cleargate-cli/test/scripts/test_update_state.test.ts` if it exercises story.ts spawn paths.
- **CR-050's shim deletion is irreversible mid-sprint.** Once the back-compat block is removed, any pre-existing caller that hasn't been migrated returns 127 (executable not found on PATH). **Mitigation:** Pre-deletion grep in Architect M-plan: `grep -rn "run_script.sh" cleargate-cli/src/commands/ --include="*.ts" | grep "spawnFn\|\\.mjs\|\\.sh"`. Must return zero matches against the OLD shim form before the shim block is deleted.
- **CR-049 audit may surface drift beyond the 4 known scripts.** Scope-cut rule: CR-049 fixes the 4 known + audit-only report for everything else. If audit shows widespread drift (15+ files), surface for SPRINT-25 fix CR. **Mitigation:** scope-cut decision belongs to orchestrator on M-plan return, not Developer.
- **CR-051's investigation may scope-cut the CR.** If root cause = session-cache (not a frontmatter bug), the CR ships SKILL.md docs only — no devops.md change. **Mitigation:** M-plan budgets for both branches; orchestrator selects branch on investigation-report return. The new test (`devops-agent-registration.node.test.ts`) ships either way.
- **CR-051 SKILL.md edit is multi-section but disjoint.** §1 (L56), §A.1 (L112), §C.7 (L349) are non-adjacent; no append-vs-insert collision. No other SPRINT-24 CR touches SKILL.md.
- **Run_script.sh canonical = live currently (224 LOC each).** No pre-existing drift. CR-050 edits both files in lockstep — no merge ordering between the two.

### 2.4 Lane Audit (FINALIZED — Architect SDR 2026-05-04, applied rubric §9 cleargate-enforcement.md)

| Item | Lane | Failing Check(s) | Rationale (≤80 chars) |
| --- | --- | --- | --- |
| CR-049 | standard | #1 (>2 files: 4 scripts + new test = 5) | 4 canonical scripts replaced + new parity test; not fast |
| CR-050 | standard | #1 (>2 files: 4 src + 4 test + 2 wrapper = 10), #4 (multi-scenario) | 8 callers + shim delete + 4 test refactors; not fast |
| CR-051 | standard | #1 (>2 files: devops.md + SKILL.md + new test ≥3) | Investigation + multi-file edit; not fast |
| CR-052 | standard | #1 (>2 files: helper + meta-test + consumer refactor = 3) | New helper + 4 meta-tests + 1 consumer refactor; not fast |

All 4 CRs fail the size cap (rubric check #1) and are correctly classified `standard`. None touches forbidden surfaces (rubric check #2); none adds dependencies (#3); all have `expected_bounce_exposure: low/med` per §1 table; all stay within EPIC-013 declared scope.

### 2.5 ADR-Conflict Flags (FINALIZED — Architect SDR 2026-05-04)

- **None blocking.** SPRINT-24 lives within established invariants. The test-helper pattern (CR-052) is additive; the canonical-drift fix (CR-049) reconciles toward the documented mirror invariant; the shim removal (CR-050) consolidates toward CR-046's canonical interface; CR-051 documents existing reality.
- **Confirmed alignment with locked decisions:**
  - **Dogfood mirror invariant (CLAUDE.md "Dogfood split — canonical vs live"):** CR-049 + CR-050 + CR-051 all edit live ↔ canonical pairs in lockstep. CR-049's parity test enforces this in CI going forward.
  - **Two-runner test policy (FLASHCARD 2026-05-04 `#node-test #vitest`):** all new tests in SPRINT-24 use `*.node.test.ts` naming + `tsx --test` runner. Confirmed in CR-049 (`canonical-live-parity.node.test.ts`), CR-051 (`devops-agent-registration.node.test.ts`), CR-052 (`wrap-script.node.test.ts`).
  - **run_script.sh wrapper canonical interface (CR-046):** CR-050 finalizes the migration CR-046 deferred. No conflict.
- **Soft flag 1 — TPV operational dogfood paradox:** SPRINT-23 shipped TPV but didn't run it. SPRINT-24 is the first sprint where TPV runs. If TPV mis-fires (e.g., flags valid Red tests as wiring-gap), surface to human; do not let dogfood paradox stall the merge. Track in §5 metrics. Ref FLASHCARD 2026-05-04 `#tpv #self-validation`.
- **Soft flag 2 — orchestrator-fallback DevOps may persist.** If CR-051 root cause is session-cache and SPRINT-24 is the sprint that discovers it, the FIRST few CRs of SPRINT-24 may still need orchestrator-fallback. Document explicitly per CR-051 §0.5 Q4. Ref FLASHCARD 2026-05-04 `#devops #agent-registry`.
- **Soft flag 3 — story.ts callers expand CR-050 scope (NEW).** Not an ADR conflict but a downstream dispatch consequence: CR-050 M-plan must list story.ts as a 4th src file. Surface to orchestrator before CR-050 dispatch.

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
