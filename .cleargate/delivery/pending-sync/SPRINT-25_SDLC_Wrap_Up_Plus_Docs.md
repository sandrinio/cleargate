---
sprint_id: SPRINT-25
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-25
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Ready
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
approved: true
human_override: false
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T19:10:22Z
stamp_error: no ledger rows for work_item_id SPRINT-25
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T19:10:22Z
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

## 2. Execution Strategy (Architect SDR finalized — 2026-05-04)

### 2.1 Phase Plan

**Wave 1 — Five parallel dispatches (no shared mutable file):**
- **CR-053** (init MANIFEST fix) — touches `cleargate-cli/src/init/copy-payload.ts` + new test + `/.gitignore`. Independent of other W1 CRs.
- **CR-054** (UTF-8 truncation) — touches `.cleargate/scripts/run_script.sh` + canonical mirror + `cleargate-cli/src/lib/script-incident.ts` (JSDoc only) + new test. The bash file is shared with CR-057 but CR-057 is in W2; W1 has no contention.
- **CR-055** (wrapScript adoption) — refactor of 4 `cleargate-cli/test/commands/*.node.test.ts` files + JSDoc on `wrap-script.ts`. No overlap with other W1 surfaces.
- **CR-056** (skill-heuristic) — touches `.cleargate/scripts/suggest_improvements.mjs` + new test + investigation report. Independent.
- **CR-058** (README refresh) — touches `/README.md`, `/cleargate-cli/README.md`, `.cleargate/scratch/SDLC_hardening_continued.md`, new lifecycle-diagram-prompt.md. No code overlap; soft prose-coupling to CR-053 (see §2.3).

**W1 dispatch posture:** all 5 CRs may be dispatched concurrently. The DevOps merge order within W1 is not constrained by file collision (no two W1 CRs touch the same file) — order DevOps merges by completion timestamp. Exception: CR-053 SHOULD merge before CR-058's final QA-Verify (see §2.3 prose-coupling warning); orchestrator gates CR-058's merge on CR-053 having merged.

**Wave 2 — CR-057 alone (sequential after CR-054):**
- **CR-057** (self-repair) — depends on CR-054's `head -c $MAX_BYTES` byte-correct truncation already landed in `run_script.sh`. Rationale: in CODE-MODE, CR-057 ships `_run_script_self_repair.sh` (or `.mjs`) sibling that run_script.sh calls on non-zero exit. The sibling reads the captured stderr (truncated by `_truncate_stream`) for pattern-match dispatch. If CR-057 lands first, the sibling's pattern-match logic may be tuned against char-truncated stderr signatures; later CR-054 byte-fix would invalidate the patterns. Sequential merge eliminates the rework.
- **Investigation outcome may pivot to DOCS-MODE.** Per CR-057 §4 acceptance, if the corpus shows no pattern with ≥2 occurrences (and SPRINT-23 contributed 0 incidents — verified via `ls .cleargate/sprint-runs/SPRINT-23/.script-incidents/` returning empty; SPRINT-24 has 3 files), CR-057 ships only `.cleargate/knowledge/script-incident-corpus-analysis.md` and updates CR-046 §0.5 Q3 status. No `run_script.sh` change in DOCS-MODE → the W2 wave-split is a no-op overhead in DOCS-MODE. Acceptable; preserve sequential ordering for safety.

### 2.2 Merge Ordering

| Shared File | Items | Order | Rationale |
| --- | --- | --- | --- |
| `.cleargate/scripts/run_script.sh` | CR-054, CR-057 (CODE-MODE only) | CR-054 → CR-057 | CR-057 sibling-call hook lands at non-zero exit path; needs byte-correct `_truncate_stream` already in place so pattern-matching reads correct stderr. DOCS-MODE skips this file → no contention. |
| `cleargate-planning/.cleargate/scripts/run_script.sh` (canonical mirror) | CR-054, CR-057 (CODE-MODE only) | CR-054 → CR-057 | Mirror parity invariant (FLASHCARD 2026-04-19 #wiki #protocol #mirror). Both edits must lockstep with their live-side counterpart in the same commit; sequential merge preserves the invariant. |
| `cleargate-cli/src/lib/script-incident.ts` | CR-054 (JSDoc on MAX_STREAM_BYTES, L16-18), CR-057 (CODE-MODE only — adds optional `retry_attempt: number` field) | CR-054 → CR-057 | JSDoc edit and interface extension are physically distinct lines, but sequential ordering still safer: CR-057's interface change is a schema-evolution event (FLASHCARD 2026-05-04 #cr-046 #wrapper #breaking-change applies — pair schema change with one production-path test, which CR-057 §2 already provides). |
| `cleargate-cli/test/commands/{sprint,state,gate,story}.node.test.ts` | CR-055 only | n/a | Single-CR refactor; 4 files all owned by CR-055. |
| `cleargate-cli/src/init/copy-payload.ts` | CR-053 only | n/a | Single-CR addition to `SKIP_FILES` (L49). |
| `.cleargate/scripts/suggest_improvements.mjs` | CR-056 only | n/a | Single-CR heuristic refactor. |
| `/README.md`, `/cleargate-cli/README.md` | CR-058 only | n/a | Single-CR docs refresh. |
| `/.gitignore` | CR-053 only (line removal of `/MANIFEST.json`) | n/a | Single-CR edit; no prebuild interaction. |
| `.cleargate/scratch/SDLC_hardening_continued.md` | CR-058 only | n/a | Single-CR scratch update. |
| `cleargate-planning/MANIFEST.json` (prebuild artifact) | CR-053, CR-054, CR-055 (any CR touching tracked files under `cleargate-planning/` or root scaffold) | regenerated post-each-merge by `npm run build` | FLASHCARD 2026-05-01 #manifest #prebuild — MANIFEST.json SHAs change after every protocol/template edit; regenerate in the SAME commit as the edit or doctor flags drift on next session. DevOps's post-merge mechanic re-runs prebuild; orchestrator must verify MANIFEST.json is staged in the merge commit. |

### 2.3 Shared-Surface Warnings

- **CR-054 + CR-057 share `run_script.sh` (live + canonical).** Sequential merge order via wave split. CR-057's M1 plan must re-read `run_script.sh` post-CR-054 merge to pin line ranges for the self-repair sibling integration point — the line numbers will have shifted by ~2 lines (pattern: replace `${content:0:$MAX_BYTES}` with `head -c $MAX_BYTES "$file"`). Mirror parity invariant holds at every CR boundary, not just sprint close — CR-054 Dev pairs canonical + live in one commit; same for CR-057.

- **CR-054 + CR-057 share `script-incident.ts`.** CR-054 edits JSDoc only (L16-18, MAX_STREAM_BYTES semantics clarification). CR-057 CODE-MODE adds an optional `retry_attempt: number` interface field. Lines are physically separate but sequential merge eliminates merge-conflict risk and respects the FLASHCARD 2026-05-04 #cr-046 #wrapper #breaking-change rule on schema evolution (pair with production-path test — CR-057 §2 ships `run-script-self-repair.red.node.test.ts` covering the new field).

- **CR-053 prose-coupling to CR-058.** CR-058's `## What's New` section and `Getting started` rewrite reference `cleargate init` as "no longer writes root MANIFEST.json post-CR-053". This statement is true only AFTER CR-053 merges. Resolve via DevOps merge order: CR-053 must merge before CR-058's QA-Verify runs. Orchestrator gate: hold CR-058's QA-Verify dispatch until CR-053 state is `Merged`. Alternative escape hatch: CR-058 footnotes the claim as "post-CR-053 (this sprint)" — equally valid.

- **CR-056 false-positive may surface real pattern.** CR-056 §3 Out of scope says "no skill ships in CR-056". If investigation reveals a real recurring pattern (not the diagnosed token-attribution artifact), surface to human via CR's §4 Execution Log; queue for SPRINT-26. Do NOT design or ship a skill in this CR — the investigation budget is ≤30min, the design budget for a real skill is much larger.

- **CR-057 may scope-cut to DOCS-MODE.** Branch decision happens during the ≤30min investigation phase. Both branches have explicit acceptance criteria in CR-057 §4. Pre-evidence: SPRINT-23 has 0 incident files (`.cleargate/sprint-runs/SPRINT-23/.script-incidents/` is empty); SPRINT-24 has 3. Total corpus = 3 incidents. The threshold for CODE-MODE is "≥2 occurrences per pattern across ≥1 commands". A corpus of 3 incidents that all share the same exit_code + stderr signature would clear the bar; otherwise DOCS-MODE. Orchestrator should expect DOCS-MODE as the high-probability outcome; size the W2 dispatch accordingly.

- **MANIFEST.json regen on every canonical edit.** FLASHCARD 2026-05-01 #manifest #prebuild flags the trap: edits under `cleargate-planning/` or scaffold-tracked files invalidate `cleargate-planning/MANIFEST.json` SHAs. DevOps merge step must re-run `npm run build` (regenerates MANIFEST.json) and stage the regenerated file in the same commit as the source edit. CR-054's canonical-mirror edit triggers this. CR-053, CR-055, CR-056, CR-058 do not edit canonical-tracked files (CR-053 edits cleargate-cli/src; CR-055 edits cleargate-cli/test; CR-056 edits `.cleargate/scripts/`; CR-058 edits root README + scratch doc). Only CR-054 + CR-057-CODE-MODE require MANIFEST regen.

### 2.4 Lane Audit

Re-ran the 7-check Lane Classification rubric per CR. All 6 confirmed `standard`; no demotions to `fast`. Default migration assignment held.

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| CR-053 | standard | 3 files (src + test + .gitignore); fails ≤2-file fast-lane size cap. |
| CR-054 | standard | 4 files (bash live + canonical + ts JSDoc + new test); fails size cap. |
| CR-055 | standard | 5 files (4 caller tests + JSDoc); fails size cap. |
| CR-056 | standard | Investigation + multi-file + new test; expected_bounce_exposure=med. |
| CR-057 | standard | 2-mode CR with branching outcomes; expected_bounce_exposure=med. |
| CR-058 | standard | ~150 LOC across 4 files + new prompt; fails size cap; multi-section rewrite. |

### 2.5 ADR-Conflict Flags

- **None blocking.** All 6 CRs live within established invariants (mirror parity, file-surface contract, real-infra-no-mocks, archive-immutability, MANIFEST.json prebuild regen).

- **Soft flag 1 — TPV operational dogfood (continued).** Second sprint where TPV runs. SPRINT-25 = 6 standard-lane CRs × Mode: TPV. Track catch rate; combine with SPRINT-24's 0/4 for the §0 metrics decision threshold at SPRINT-26 kickoff (per CR-047 §0.5 Q4).

- **Soft flag 2 — DevOps registration unresolved.** CR-051 documented escape-hatch; SPRINT-25 still uses orchestrator-fallback per the documented pattern. Live SKILL.md re-sync at Gate-4 cures live drift but registration remains session-cache-bound. No CR in SPRINT-25 unblocks this; tracking-only.

- **Soft flag 3 — CR-058 prose-only edits don't lend themselves to TPV.** The TPV gate (Architect Mode: TPV) checks test wiring soundness. CR-058's tests are limited to "grep verification" (e.g., no `four-agent loop` matches left) plus the standard typecheck/test pre-commit. TPV will pass-through (no test-pattern wiring to validate). Note for the Reporter §6 metrics: count CR-058 in the denominator with caveat, not as a TPV signal contributor.

- **Soft flag 4 — schema evolution on `script-incident.ts` in CR-057 CODE-MODE.** Per FLASHCARD 2026-05-04 #cr-046 #wrapper #breaking-change, wrapper-interface schema changes orphan callers when only spawnMock-style tests exist. CR-057 §2 already ships a production-path test (`run-script-self-repair.red.node.test.ts`) covering the new `retry_attempt` field. Compliance verified at plan-time. Architect post-flight on CR-057 must re-confirm.

- **Soft flag 5 — MANIFEST.json prebuild regen contract.** Per FLASHCARD 2026-05-01 #manifest #prebuild, edits to canonical-tracked files invalidate `cleargate-planning/MANIFEST.json`. CR-054 (canonical mirror edit) and CR-057 CODE-MODE (canonical mirror + new sibling) trigger this. DevOps merge step for those two CRs MUST stage the regenerated MANIFEST.json in the same commit. Orchestrator gates DevOps dispatch on `npm run build` running clean. The other 4 CRs (CR-053/055/056/058) do not touch `cleargate-planning/` and do not require regen.

- **Soft flag 6 — `.cleargate/scripts/` is FIRST_INSTALL_ONLY in copy-payload.** Per `cleargate-cli/src/init/copy-payload.ts:65-69`, `.cleargate/scripts/*` is exempt from re-init overwrites. CR-054's edit to live `.cleargate/scripts/run_script.sh` is the dogfood-instance edit; the SPRINT-25 close `cleargate init` re-sync will NOT overwrite it (FIRST_INSTALL_ONLY). Canonical mirror edit propagates to user-repos via fresh `cleargate init`. No conflict; documenting for completeness.

## 3. Risks & Dependencies

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| CR-057 finds no recurring patterns | High | DOCS-MODE acceptance shipped per CR-057 §4; orchestrator pre-sized for DOCS-MODE outcome (corpus = 3 incidents) |
| CR-056 surfaces real pattern (not false-positive) | Low | §3 Out of scope says no skill ships; queue for SPRINT-26 |
| CR-058 scope creep across all README sections | Medium | Strict acceptance grep + spot-check by QA-Verify; stay in named sections |
| TPV mis-fires on prose-only CR-058 | Low | TPV scope = test wiring; CR-058 has minimal test surface; expect pass-through |
| CR-053 SKIP_FILES vs FIRST_INSTALL_ONLY confusion | Low | CR-053 §0.5 Q5 default explicitly separates the two mechanisms |
| Merge conflict CR-054 + CR-057 on run_script.sh | Low | Sequential wave split; CR-057 re-reads post-CR-054 merge |
| MANIFEST.json prebuild drift on canonical-mirror commits | Medium | DevOps merge step runs `npm run build` and stages regen file in same commit (CR-054 + CR-057-CODE-MODE only) |
| CR-058 prose claim about CR-053 lands before CR-053 merges | Low | Orchestrator gates CR-058 QA-Verify on CR-053 = Merged; alternative footnote escape hatch documented |

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
