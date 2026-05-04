---
sprint_id: SPRINT-25
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-25
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Draft
execution_mode: v2
start_date: 2026-05-05
end_date: 2026-05-16
created_at: 2026-05-04T19:00:00Z
updated_at: 2026-05-04T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Sprint 4 (closing) of the SDLC Hardening multi-sprint roadmap.
  SPRINT-22 landed structural changes (TDD discipline + DevOps role).
  SPRINT-23 landed cross-cutting tooling (Sprint Context File,
  run_script.sh wrapper, Triage rubric + TPV gate, orphan reconciler).
  SPRINT-24 landed carry-over cleanup (canonical drift, shim retire,
  DevOps registration findings, wrapScript helper). SPRINT-25 wraps
  the arc: 5 small carry-overs + bring docs current.

  Theme: "SDLC Hardening Wrap-Up + Docs Aligned" — finish the
  remaining carry-over backlog AND bring README + cleargate-cli/README
  current with the SPRINT-22..SPRINT-24 reality (5-role 7-step loop,
  TPV gate, DevOps role, Gate 3 preflight, Gate 4 close, Sprint
  Context File). After this sprint, the docs match the framework;
  the SDLC Hardening arc closes; future sprints return to product
  direction.

  CRs:
  - **CR-053 cleargate init MANIFEST.json bug** — payload-copy writes
    /MANIFEST.json to user-repo root; bit SPRINT-23 + SPRINT-24
    closes; .gitignore stopgap added in SPRINT-24 commit 5fd8b22;
    CR-053 fixes root cause + removes stopgap.
  - **CR-054 run_script.sh UTF-8 truncation** — `${var:0:N}` is char-
    index not byte-count; deferred from CR-046 §0.5 Q3; CR-054 swaps
    to byte-correct `head -c N`.
  - **CR-055 wrapScript caller-test adoption** — CR-052 shipped helper;
    CR-050 caller tests bypassed it (spawnFn-arg-capture); CR-055
    refactors 4 caller tests to consume wrapScript end-to-end.
  - **CR-056 skill-candidate heuristic investigation** — suggest_
    improvements.mjs flags "CR-045 × architect" as skill candidate
    every sprint; investigation reveals false-positive (token-
    attribution artifact); CR-056 tightens heuristic.
  - **CR-057 run_script.sh self-repair (incident-corpus driven)** —
    deferred from CR-046 §0.5 Q3; SPRINT-23 + SPRINT-24 incident
    corpus now exists; CR-057 investigates patterns, ships bounded
    self-repair OR docs-only scope-cut.
  - **CR-058 README refresh + lifecycle diagram prompt** — README
    branding is "four-agent loop"; reality is 5-role 7-step. CR-058
    rewrites README §3 + §What `init` lays down + §Getting started;
    expands cleargate-cli/README Commands; ships
    lifecycle-diagram-prompt.md (image-gen prompt for user to feed
    to external generator at Gate 4 close).

  Plus passive (no work item):
  - TPV catch-rate metric continues; SPRINT-26 kickoff makes downgrade
    decision per CR-047 §0.5 Q4 (need ≥2 sprints of data).
  - DevOps subagent registration true-fresh-session test (informal).

  Carry-over deferred to SPRINT-26+:
  - INTERNALS.md substantive refresh (CR-058 verifies presence only)
  - Lifecycle SVG redraw (user runs CR-058's prompt through external
    image generator post-sprint, commits the result)
  - Adapter implementations (Jira/Linear/GitHub Projects) — separate epic
epics: []
stories: []
crs:
  - CR-053
  - CR-054
  - CR-055
  - CR-056
  - CR-057
  - CR-058
bugs: []
proposals: []
approved: false
human_override: false
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T18:43:17Z
stamp_error: no ledger rows for work_item_id SPRINT-25
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:43:16Z
  sessions: []
---

# SPRINT-25: SDLC Hardening Wrap-Up + Docs Aligned

## 0. Stakeholder Brief

> Sponsor-readable summary.

- **Sprint Goal:** Finish the SDLC Hardening arc with 5 small carry-over CRs (CR-053 root MANIFEST bug, CR-054 UTF-8 truncation, CR-055 wrapScript adoption, CR-056 skill-heuristic investigation, CR-057 self-repair) and bring docs current with the SPRINT-22..SPRINT-24 reality (CR-058 — README + cleargate-cli/README + lifecycle diagram image-gen prompt). After this sprint, the framework's "five-role 7-step loop with 4 gates" is accurately documented; the SDLC Hardening arc closes; future sprints return to product direction.
- **Business Outcome:** New users see the actual framework (5-role loop, TPV gate, DevOps role, 4 gates) in the README. Existing operators get bounded self-repair on common script failures (or documented "no-pattern-found" if corpus thin). The npm package commands list is complete. The lifecycle diagram refresh is queued for the user's image generator at sprint close. Net expected impact on SPRINT-26+: faster onboarding, fewer doc-vs-reality contradictions, lower friction on script failures, and the SDLC arc fully retired.
- **Risks (top 3):**
  1. **CR-058 scope creep.** README is 200+ lines; rewriting §3 + §6 + §7 + §What `init` lays down + §Getting started is wide. Mitigation: single CR with strict acceptance grep ("no `four-agent loop` matches"); spot-check via QA-Verify; stop at the listed sections, do not refactor structure.
  2. **CR-057 finds no recurring patterns.** Incident corpus may be too thin (3+ files; needs ≥2 occurrences per pattern per CR-057 §0.5 Q1 default). Scope-cut to docs-only mode is documented; no risk to sprint shape.
  3. **CR-056 reveals real pattern (not false-positive).** Investigation surprise; CR-056 §3 Out of scope says "no skill ships in CR-056". Surface for SPRINT-26 follow-up; do not balloon.
- **Metrics:**
  - **Doc accuracy:** post-CR-058, `grep -E "four-agent loop|Architect → Developer → QA → Reporter" README.md cleargate-cli/README.md` returns 0 matches.
  - **Self-repair signal:** post-CR-057, either ≥1 recurring pattern shipped with bounded retry OR knowledge doc explicitly closes the question with revisit-trigger.
  - **TPV catch-rate (passive):** SPRINT-25 has 6 standard-lane CRs. Track: did TPV catch ≥1 wiring gap? If 0/6 (combined with SPRINT-24's 0/4 = 0/10 across two sprints), strong signal to downgrade per CR-047 §0.5 Q4 at SPRINT-26 kickoff.
  - **wrapScript adoption:** post-CR-055, 4 caller test files import wrapScript; suite runtime ≤ 2× pre-refactor.
  - **Heuristic noise:** post-CR-056, SPRINT-25 own improvement-suggestions.md does not re-list CR-045 × architect (or lists with "known-false-positive" marker).
  - **MANIFEST.json bug:** post-CR-053, fresh `cleargate init` does NOT write `/MANIFEST.json` at user-repo root; `.gitignore` stopgap removed.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`CR-053`](CR-053_Cleargate_Init_Manifest_Root_Bug.md) | CR | cleargate init MANIFEST.json root-path bug | standard | S | y (W1 parallel) | low | W1 |
| [`CR-054`](CR-054_Run_Script_UTF8_Truncation.md) | CR | run_script.sh UTF-8 byte-correct truncation | standard | S | y (W1 parallel) | low | W1 |
| [`CR-055`](CR-055_WrapScript_Caller_Test_Adoption.md) | CR | wrapScript helper adoption in 4 caller tests | standard | M | y (W1 parallel) | low | W1 |
| [`CR-056`](CR-056_Skill_Candidate_Heuristic_Investigation.md) | CR | skill-candidate heuristic — investigation + fix | standard | M | y (W1 parallel) | med | W1 |
| [`CR-057`](CR-057_Run_Script_Self_Repair.md) | CR | run_script.sh self-repair (incident-corpus driven) | standard | M | y (W2 alone — depends on CR-054 byte fix) | med | W2 |
| [`CR-058`](CR-058_README_Refresh_Plus_Diagram_Prompt.md) | CR | README refresh + lifecycle diagram image-gen prompt | standard | M-L | y (W1 parallel — docs only, no code overlap) | low | W1 |

**Estimated totals:** 6 CRs across 2 waves. Complexity: 2×S + 3×M + 1×M-L. Lane mix: 6 standard. Parallelism: W1 = 5 parallel (CR-053/054/055/056/058), W2 = 1 (CR-057 — depends on CR-054 byte-truncation landing first since self-repair may interact with truncated stderr signatures).

**Dispatch unit estimate:** 6 × full 7-step loop = ~42 dispatches. SPRINT-24 was 28; SPRINT-25 step-up explained by 6 vs 4 CRs. Acceptable; standard lanes parallelize well.

## 2. Execution Strategy (preliminary — Architect SDR finalizes)

### 2.1 Phase Plan

**Wave 1 — Five parallel dispatches:**
- CR-053 (init MANIFEST fix) — independent (cleargate-cli/src/init/)
- CR-054 (UTF-8 truncation) — independent (.cleargate/scripts/ + script-incident.ts)
- CR-055 (wrapScript adoption) — independent (test/commands/ refactor)
- CR-056 (skill-heuristic) — independent (suggest_improvements.mjs)
- CR-058 (README refresh) — independent (docs only)

**Wave 2 — CR-057 alone:**
- CR-057 (self-repair) — depends on CR-054 byte-truncation landing first (self-repair logic may inspect stderr signatures; needs byte-correct input).

### 2.2 Merge Ordering (preliminary)

| Shared File | Items | Merge Order | Rationale |
| --- | --- | --- | --- |
| `.cleargate/scripts/run_script.sh` (+ canonical) | CR-054, CR-057 | CR-054 → CR-057 | CR-057's self-repair sibling sources/calls run_script.sh; needs byte-correct truncation already in place. |
| `cleargate-cli/src/lib/script-incident.ts` | CR-054 (JSDoc), CR-057 (interface +retry_attempt) | CR-054 → CR-057 | Sequential within W2. |
| `cleargate-cli/test/commands/{sprint,state,gate,story}.node.test.ts` | CR-055 only | n/a | Single-CR refactor. |
| `cleargate-cli/src/init/copy-payload.ts` | CR-053 only | n/a | Single-CR edit. |
| `.cleargate/scripts/suggest_improvements.mjs` | CR-056 only | n/a | Single-CR edit. |
| `/README.md` + `/cleargate-cli/README.md` | CR-058 only | n/a | Single-CR edit. |
| `/.gitignore` | CR-053 only (line removal) | n/a | Single-CR edit. |
| `.cleargate/scratch/SDLC_hardening_continued.md` | CR-058 only | n/a | Single-CR edit. |

### 2.3 Shared-Surface Warnings (preliminary)

- **CR-054 + CR-057 shared run_script.sh.** Sequential merge order via wave split. CR-057 M1 plan re-reads run_script.sh post-CR-054 merge to pin line ranges for the self-repair sibling integration point.
- **CR-056 false-positive may surface real pattern.** §3 Out of scope says "no skill ships in CR-056". If investigation reveals a real recurring pattern, surface to human via §4 Execution Log; queue for SPRINT-26.
- **CR-057 may scope-cut to docs-only.** Branch decision happens during investigation phase. Both branches have acceptance criteria in CR-057 §4.
- **CR-058 + cleargate init runtime check.** CR-053 ships first OR CR-058 doc'd outcome assumes CR-053 ships. If CR-058 documents Gate-4 doc-refresh as "cleargate init no longer writes root MANIFEST.json", that statement is true only AFTER CR-053 lands. Resolve via merge order: CR-053 lands before CR-058 final commit OR CR-058 footnotes "post-CR-053 behavior".

### 2.4 Lane Audit (preliminary)

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| CR-053 | standard | Multi-file (src + test + .gitignore); doesn't fit fast-lane size cap. |
| CR-054 | standard | Multi-file (bash + ts + new test) + interface concern. |
| CR-055 | standard | 4-file refactor + JSDoc; not fast (touches multiple subsystems). |
| CR-056 | standard | Investigation + multi-file + new test. |
| CR-057 | standard | Investigation + potential code addition + 2-mode acceptance. |
| CR-058 | standard | Multi-section README rewrite + new prompt file + scratch doc edit. |

### 2.5 ADR-Conflict Flags (preliminary — Architect SDR finalizes)

- **None blocking.** All 6 CRs live within established invariants (mirror parity, file-surface contract, real-infra-no-mocks, archive-immutability).
- **Soft flag 1 — TPV operational dogfood (continued).** Second sprint where TPV runs. SPRINT-25 = 6 standard-lane CRs × Mode: TPV. Track catch rate; combine with SPRINT-24's 0/4 for the §5 metrics decision threshold.
- **Soft flag 2 — DevOps registration unresolved.** CR-051 documented escape-hatch; SPRINT-25 still uses orchestrator-fallback per the documented pattern. Live SKILL.md re-sync cures live drift but registration remains session-cache-bound.
- **Soft flag 3 — CR-058 prose-only edits don't lend themselves to TPV.** The TPV gate (Architect Mode: TPV) checks test wiring soundness. CR-058's tests are limited to "grep verification" (e.g., no `four-agent loop` left). TPV will pass-through but signal value is low for prose-only CRs. Note for the Reporter §6.

## 3. Risks & Dependencies

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| CR-057 finds no recurring patterns | Medium | DOCS-MODE acceptance shipped per CR-057 §4 |
| CR-056 surfaces real pattern (not false-positive) | Low | §3 Out of scope says no skill ships; queue for SPRINT-26 |
| CR-058 scope creep across all README sections | Medium | Strict acceptance grep + spot-check by QA-Verify; stay in named sections |
| TPV mis-fires on prose-only CR-058 | Low | TPV scope = test wiring; CR-058 has minimal test surface; expect pass-through |
| CR-053 SKIP_FILES vs FIRST_INSTALL_ONLY confusion | Low | CR-053 §0.5 Q5 default explicitly separates the two mechanisms |
| Merge conflict CR-054 + CR-057 on run_script.sh | Low | Sequential wave split; CR-057 re-reads post-CR-054 merge |

## 4. Execution Log

(populated during sprint)

## 5. Metrics & Metadata

(populated at sprint close — see §0 Brief metrics list)

## Execution Guidelines (Local Annotation — Not Pushed)

- All 6 CRs run under the SPRINT-22..SPRINT-24 7-step loop with TPV operational.
- DevOps merges via orchestrator-fallback inline (CR-051 escape hatch).
- Mirror parity audit at every DevOps merge; CR-049's parity test guards.
- Live SKILL.md re-sync at Gate-4 if any CR touches `cleargate-planning/.claude/skills/`.
- Reporter Brief at Gate 4 must include the lifecycle-diagram-prompt.md surfacing (per CR-058 §0.5 Q5 default).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Yellow — Awaiting human review of Brief**

- [x] §0 Stakeholder Brief written (goal, outcome, top-3 risks, metrics).
- [x] §1 Consolidated Deliverables table populated (6 CRs).
- [x] §2 Execution Strategy populated preliminary (Architect SDR finalizes at kickoff).
- [x] §3 Risks & Dependencies surfaced (6 rows).
- [x] All 6 anchor CRs drafted in pending-sync/ with §0.5 Open Questions.
- [ ] Human approves Brief + Open Questions across all 6 CRs (or overrides).
- [ ] Status flips Draft → Ready, approved: true.
- [ ] Architect SDR pre-confirm at sprint kickoff (Phase A.4).

---
