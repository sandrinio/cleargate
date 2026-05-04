---
sprint_id: "SPRINT-25"
status: "Shipped"
generated_at: "2026-05-04T21:40:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- Sprint Report v2 Template — template_version: 2 -->
<!-- Event-type vocabulary (STORY-013-05 / protocol §§2–17):
     User-Review: UR:review-feedback | UR:bug
     Change-Request: CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change
     Circuit-breaker: test-pattern | spec-gap | environment
     Lane-Demotion: LD
     These tokens appear verbatim in §2 CR Change Log and §3 Execution Metrics tallies. -->

# SPRINT-25 Report: SDLC Hardening Wrap-Up + Docs Aligned

**Status:** Shipped
**Window:** 2026-05-04 to 2026-05-04 (1 execution day; planned window 2026-05-05 to 2026-05-16)
**CRs:** 6 planned / 6 shipped / 0 carried over

---

## §1 What Was Delivered

### User-Facing Capabilities

- **README rebranded to five-role agent loop (CR-058).** README §3 heading, tagline, and all four prior occurrences of "four-agent loop" now read "Five-Role Agent Loop". Roles listed: Architect, Developer, QA, DevOps, Reporter. Commit: `0439e2c` / merge `9e006e3`.
- **`cleargate init` no longer writes root `MANIFEST.json` (CR-053).** `SKIP_FILES` set in `copy-payload.ts` now excludes `MANIFEST.json`; SPRINT-24 `.gitignore` stopgap lines 51–55 removed. Commit: `1498862`.
- **`cleargate-cli/README` Commands section expanded (CR-058).** `sprint preflight`, `gate check`, `doctor`, `state update/validate`, `story start/done` added (~+20 LOC). Commit: `0439e2c`.
- **Lifecycle diagram image-gen prompt shipped (CR-058).** `.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md` (~80+ lines, structured headings) ready for user to feed to an external image generator at Gate 4.

### Internal / Framework Improvements

- **`run_script.sh` byte-correct UTF-8 truncation (CR-054).** `_truncate_stream()` now uses `head -c $MAX_BYTES` instead of `${var:0:N}` char-slicing. Live + canonical mirror patched in same commit. `cleargate-planning/MANIFEST.json` regenerated. Red test shipped. Commit: `11ed7ff` / merge `22686ed`.
- **wrapScript end-to-end adoption in 4 caller tests (CR-055).** `sprint.node.test.ts`, `state.node.test.ts`, `gate.node.test.ts`, `story.node.test.ts` refactored from spawnFn-arg-capture to real `wrapScript` invocations. Top-of-file JSDoc canonical-pattern block added to `wrap-script.ts`. Commit: `b847e38` / merge `428de72`.
- **Skill-candidate heuristic false-positive eliminated (CR-056).** `suggest_improvements.mjs` `scanSkillCandidates` (L141–260) now applies session-shared filter, cross-sprint dedup by hash, and raised threshold. Live + canonical mirror patched. 3 Red scenarios shipped. Findings report at `.cleargate/sprint-runs/SPRINT-25/skill-candidate-heuristic-findings.md`. Commit: `508e943` / merge `12fb4bb`.
- **CR-057 self-repair investigation — DOCS-MODE outcome.** Corpus tally: 3 incidents (SPRINT-23: 0, SPRINT-24: 3); 2 are synthetic test artefacts (`exit_code: 127`); 1 is a real usage-error (`exit_code: 1`, multi-state.json). No pattern ≥2 real occurrences — CODE-MODE threshold unmet. Knowledge doc at `.cleargate/knowledge/script-incident-corpus-analysis.md`. CR-046 §0.5 Q3 formally closed as deferred-with-threshold. Commit: `f0c0793` / merge `4bebd8d`.
- **SDLC scratch retro updated (CR-058).** `.cleargate/scratch/SDLC_hardening_continued.md` marks SPRINT-22/23/24 complete; SPRINT-25 wrap-up section added; arc closure noted.
- **DevOps escape-hatch pattern validated.** All 6 CRs merged via orchestrator-fallback inline DevOps (devops subagent type unregistered all sprint). Pattern works; root-cause investigation deferred to SPRINT-26.

### Carried Over

- INTERNALS.md substantive refresh (CR-058 verified presence only; substantive edit is separate scope).
- Lifecycle SVG redraw (user runs CR-058's prompt.md through external image generator post-Gate-4).
- Adapter implementations (Jira/Linear/GitHub Projects — not in SDLC Hardening arc scope).
- CLAUDE.md residue: "four-agent loop" string remains at CLAUDE.md L61, L96, L104 and cleargate-planning/CLAUDE.md L10, L58 (out of CR-058 scope).
- `pre_gate_runner.sh` broken path-redirect bug (surfaced post-CR-053 flight; tracked in FLASHCARD 2026-05-04 `#pre-gate #scanner #dogfood`).
- DevOps subagent registration unresolved (escape-hatch preserved; root cause unknown).

---

## §2 Story Results + CR Change Log

### CR-053: `cleargate init` MANIFEST.json root-path bug

- **Status:** Done
- **Complexity:** S
- **Commits:** `1498862` (feat) / `0bd8fbc` (staging) / `eb233f3` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None — first-pass success.
- **UR Events:** None.

---

### CR-054: `run_script.sh` UTF-8 byte-correct truncation

- **Status:** Done
- **Complexity:** S
- **Commits:** `11ed7ff` (feat) / `0a395dc` (QA-red) / `857da6d` (staging) / `22686ed` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None — first-pass success.
- **UR Events:** None.

---

### CR-055: wrapScript helper adoption in 4 caller tests

- **Status:** Done
- **Complexity:** M
- **Commits:** `b847e38` (feat) / `c8d38c9` (staging) / `428de72` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None — first-pass success.
- **UR Events:** None.

---

### CR-056: Skill-candidate heuristic investigation + fix

- **Status:** Done
- **Complexity:** M
- **Commits:** `83fa4a2` (QA-red) / `508e943` (feat) / `17922bf` (staging) / `12fb4bb` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None — first-pass success.
- **UR Events:** None.

---

### CR-057: `run_script.sh` self-repair (DOCS-MODE outcome)

- **Status:** Done
- **Complexity:** S (DOCS-MODE branch; no code shipped)
- **Commits:** `f0c0793` (feat/docs) / `32b9239` (staging) / `4bebd8d` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None. Branch decision (DOCS-MODE) was pre-validated by Architect plan-time evidence; Dev confirmed tally independently.
- **UR Events:** None.

---

### CR-058: README refresh + lifecycle diagram prompt

- **Status:** Done
- **Complexity:** M-L (docs)
- **Commits:** `0439e2c` (feat) / `7c1d144` (staging) / `9e006e3` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | MCP adapter Jira/Linear/GHP claim softened post-grep (adapters not shipped — only framework stubs); prose updated to "adapter framework; native integrations in development" | 0 bounces |
- **UR Events:** None.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| CRs planned | 6 |
| CRs shipped (Done) | 6 |
| CRs escalated | 0 |
| CRs carried over | 0 |
| Fast-Track Ratio | 0% (all standard-lane; schema_version=2, no fast-lane assignments) |
| Fast-Track Demotion Rate | 0% (no fast-lane assignments made) |
| Hotfix Count (sprint window) | 0 (HOTFIX-001 merged 2026-04-30, before sprint window) |
| Hotfix-to-Story Ratio | 0.0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 0 |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 1 (CR-058 MCP adapter softening) |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 0% |
| **Enhancement Tax** | 0% |
| **First-pass success rate** | 100% (6/6 — qa_bounces=0 AND arch_bounces=0 for all CRs) |
| Token source: ledger-primary | 84,112,627 tokens (input: 632 / output: 295,735 / cache_creation: 1,952,859 / cache_read: 81,863,401) |
| Token source: story-doc-secondary | N/A (no token_usage frontmatter in story docs) |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs task-notif) | N/A — secondary/tertiary sources absent |
| Token divergence flag (>20%) | NO |
| **Estimated cost (USD)** | ~$181.60 (claude-opus-4-7 rates: $15/MTok input, $75/MTok output, $18.75/MTok cache_creation, $1.50/MTok cache_read; rates as of 2025-08-01) |
| **Wall time** | 2026-05-04T19:10:47Z → 2026-05-04T21:16:38Z (~2h 6min) |
| **Agent dispatches** | 27 total (architect: 12, qa: 9, developer: 6) |

**Per-agent token breakdown:**

| Agent | Tokens | Dispatches |
|---|---|---|
| architect | 46,023,125 | 12 |
| qa | 24,703,191 | 9 |
| developer | 13,386,311 | 6 |

**Per-work-item token breakdown:**

| Work Item | Tokens |
|---|---|
| SPRINT-25 (init/SDR) | 20,027,155 |
| M1 (milestone plan) | 4,517,306 |
| M2 (milestone plan) | 7,544,345 |
| CR-053 | 9,999,756 |
| CR-054 | 14,924,753 |
| CR-055 | 6,151,773 |
| CR-056 | 6,671,408 |
| CR-057 | 6,232,725 |
| CR-058 | 8,043,406 |

**TPV catch-rate:** 0/4 CRs that ran TPV (CR-055 — refactor/no test; CR-058 — prose-only/pass-through; CR-057 — DOCS-MODE/no test; counted in denominator with caveat per sprint plan §2.5 soft flag 3). CRs with genuine TPV trials: CR-053 (1 Red test, PASS), CR-054 (1 Red test, PASS), CR-056 (3 Red scenarios, PASS). Combined with SPRINT-24's 0/4 = 0/8 consecutive no-catch sprint-pairs. Strong signal for SPRINT-26 downgrade decision per CR-047 §0.5 Q4.

**DevOps escape-hatch note:** All 6 merges executed via orchestrator-fallback inline DevOps (devops subagent type unregistered for the entire sprint). No DevOps tokens attributed separately in ledger; DevOps work folded into architect/developer dispatch context. Token attribution is incomplete for DevOps-role work.

---

## §4 Observe Phase Findings

Observe phase: no findings.

---

## §5 Lessons

### New Flashcards (Sprint Window)

The ledger context bundle reports the sprint window as `[2026-05-05 → 2026-05-16]` with no flashcard entries found in that range. However, several flashcards dated `2026-05-04` were written during sprint execution (visible in FLASHCARD.md lines 7–23 of the file read above). These are the load-bearing cards added this sprint:

| Date | Tags | Lesson |
|---|---|---|
| 2026-05-04 | `#qa #scratch #gitignore` | scratch/ is gitignored — Dev cannot update from worktree path; QA must verify on main-repo disk |
| 2026-05-04 | `#qa #report #worktree-vs-main` | QA agent sometimes writes report to worktree-relative path; orchestrator must copy to main-repo before merge |
| 2026-05-04 | `#heuristic #session-shared` | isSessionShared: distinct-session-count==1 (NOT "≥2 of ≥3 share same session") — looser rule false-flags real 2+1 patterns |
| 2026-05-04 | `#red-test #scripts #env` | Red scenarios for .mjs scripts: invoke via spawnSync(node, [scriptPath]), NOT wrapScript; use CLEARGATE_SPRINT_DIR + CLEARGATE_SPRINT_RUNS_DIR env overrides |
| 2026-05-04 | `#pre-gate #scanner #dogfood` | pre_gate_runner.sh exits 1 with empty record output; suspect pre_gate_common.sh:53 redirect path bug; investigate at SPRINT-26 kickoff |
| 2026-05-04 | `#devops #agent-registry` | devops subagent type may not register in long Claude Code sessions even when .claude/agents/devops.md exists; orchestrator-fallback preserves merge pipeline |
| 2026-05-04 | `#cr-046 #wrapper #breaking-change` | run_script.sh interface flip orphaned 6 callers under v2; spawnMock-only tests masked breakage; always pair wrapper changes with one production-path integration test |
| 2026-05-04 | `#wrapper #e2e-test-pattern` | For wrapper-interface changes, copy wrapper into os.tmpdir() alongside fixture scripts and spawnSync the real wrapper; catches drift spawnMock-style tests cannot |

### Flashcard Audit (Stale Candidates)

Stale-detection pass run against active (no `[S]`/`[R]`) cards in FLASHCARD.md. Cards are dense; symbol extraction run against the most recently-written cards:

- Card `2026-05-04 · #snapshot #hooks` — references `cr-NNN.sh`, `hooks-snapshots.test.ts`. File `hooks-snapshots.test.ts` exists in cleargate-cli test tree; `cr-NNN.sh` is a naming pattern not a specific file. Not stale.
- Card `2026-05-04 · #token-ledger #devops` — references `token-ledger.sh` L121-141, L227. File exists at `.cleargate/scripts/token-ledger.sh`. Not stale.
- Card `2026-05-01 · #cli #sprint #scripts` — references `CLEARGATE_STATE_FILE` env var and `cleargate story start`. Symbol `CLEARGATE_STATE_FILE` is live in `cleargate-cli/src/` codebase. Not stale.
- Card `2026-05-01 · #scaffold #mirror #prebuild` — references `copy-planning-payload.mjs` and `cleargate-cli/templates/cleargate-planning/`. Both exist. Not stale.

No stale candidates confirmed for SPRINT-25 window additions. Broader audit of all 80+ active cards deferred to a dedicated tooling task (manual grep at scale is Reporter-token-heavy).

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-05-04 `#heuristic #session-shared` (isSessionShared = distinct-session-count==1) | No prior conflicting card found | N/A |

---

## §6 Framework Self-Assessment

### Templates

| Item | Rating | Notes |
|---|---|---|
| CR template completeness | Green | All 6 CR files satisfied acceptance criteria without spec-gap circuit-breaker fires |
| Sprint Plan Template usability | Green | M1 parallel dispatch matrix worked cleanly; M2 branch-decision mechanism (CODE/DOCS) was unambiguous |
| Sprint Report template (this one) | Green | v2 template populated end-to-end; §4 empty as expected for a clean sprint |

### Handoffs

| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | Zero bounces; DOCS-MODE branch for CR-057 pre-validated by Architect evidence table — Dev confirmation was clean |
| Developer → QA artifact completeness | Green | All 6 CRs accepted at QA-Verify first pass |
| QA → Orchestrator kickback clarity | Green | No kickbacks issued this sprint |

### Skills

| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | CR-055/CR-056 developers cited relevant FLASHCARDs in dispatch context |
| Adjacent-implementation reuse rate | Green | CR-055 consumed wrapScript helper (CR-052); CR-054 Red test consumed wrapScript per FLASHCARD directive; no re-implementation |

### Process

| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 0 QA bounces, 0 arch bounces across 6 CRs |
| Three-surface landing compliance | Green | CR-054 + CR-056 canonical mirrors patched in same commit with MANIFEST.json regen; CR-055 test-only (no mirror needed) |
| Circuit-breaker fires (if any) | Green | 0 fires |

### Lane Audit

All 6 CRs assigned `lane: standard` by migration-default. No fast-track assignments made this sprint. `schema_version: 2` is active; lane fields present.

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| (no fast-lane CRs this sprint) | — | — | — | — | — |

### Hotfix Audit

No hotfixes merged within sprint window (2026-05-04 to 2026-05-04). HOTFIX-001 merged 2026-04-30, before sprint open.

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

Rolling 4-sprint hotfix count: SPRINT-22: 0, SPRINT-23: 0, SPRINT-24: 0 (HOTFIX-001 is dated 2026-04-30 which falls in SPRINT-24 window — however the hotfix ledger entry shows it as a BUG-018 follow-up landed in the inter-sprint window), SPRINT-25: 0. Count is flat at 0 for the measurable window. No monotonic-increase flag. Framework health on this metric is nominal.

### Tooling

| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | CR-054 byte-correct truncation shipped; CR-057 DOCS-MODE formally closes the self-repair Q3 deferral with corpus evidence and revisit threshold |
| Token ledger completeness | Yellow | DevOps escape-hatch used for all 6 merges; DevOps-role tokens folded into architect/developer attribution — no separate DevOps row in ledger. Attribution is structurally incomplete while devops subagent is unregistered |
| Token divergence finding | Green | No divergence flag (secondary/tertiary sources absent; no cross-source delta computed) |
| DevOps subagent registration | Red | devops subagent type unregistered entire sprint (FLASHCARD 2026-05-04 `#devops #agent-registry`); root cause unknown; escape-hatch works but silently misattributes tokens and prevents clean merge-pipeline separation. Must resolve at SPRINT-26 kickoff |
| pre_gate_runner.sh path bug | Red | Exits 1 with empty record output; `pre_gate_common.sh:53` redirect suspect (FLASHCARD 2026-05-04 `#pre-gate #scanner #dogfood`). Pre-gate scanner is non-functional; gate runs are bypassed or degraded |
| TPV catch-rate (2-sprint trend) | Yellow | 0/8 across SPRINT-24 + SPRINT-25 combined. SPRINT-26 kickoff: apply CR-047 §0.5 Q4 downgrade decision criteria |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-04 | Reporter agent | Initial generation |
