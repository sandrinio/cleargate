---
sprint_id: "SPRINT-09"
status: "Shipped"
generated_at: "2026-04-21T08:30:00Z"
generated_by: "Reporter agent (role: reporter)"
template_version: 1
---

<!-- Sprint Report v2 Template — template_version: 1 -->
<!-- Event-type vocabulary (STORY-013-05 / protocol §§16–17):
     User-Review: UR:review-feedback | UR:bug
     Change-Request: CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change
     Circuit-breaker: test-pattern | spec-gap | environment
-->

# SPRINT-09 Report: Execution Phase v2 — Bounce Loop, Worktrees, Pre-Gates, Self-Improvement

**Status:** Shipped
**Window:** 2026-04-21 02:37 to 2026-04-21 11:24 (+04:00) — single calendar day, ~8h47m active wall-clock on `sprint/S-09`.
**Stories:** 9 planned / 9 shipped / 0 carried over
**Execution mode:** v1 (the sprint that built v2, itself ran on v1 — see R1, held)

---

## §1 What Was Delivered

### User-Facing Capabilities

ClearGate consumers pull these in via `cleargate upgrade`. None change runtime behavior until `execution_mode: v2` flips on a Sprint Plan.

- **`cleargate sprint init|close`, `story start|complete`, `gate qa|arch`, `state update|validate`** — new CLI command groups (gated behind `execution_mode: v2`; inert under v1). Sprint-plan fixtures for v1 and v2 shipped for consumer reference. (STORY-013-08, commit `f8839ec`)
- **Sprint Report v2 template (`.cleargate/templates/sprint_report.md`)** — the six-section schema this report dogfoods. Replaces the PM/Dev split with user-facing vs internal-split §1, event-typed §2/§3 tallies, framework self-assessment §5. (STORY-013-07, commit `e256704`)
- **Sprint Plan Template v2** — gains §2 Execution Strategy (Architect Design Review output) and `parallel_eligible` + `expected_bounce_exposure` story fields. `execution_mode: v2` frontmatter slot present on the template. (STORY-013-09 + 013-08, commits `a512e1a` + `f8839ec`)

### Internal / Framework Improvements

- **Worktree + branch hierarchy contract.** `.worktrees/STORY-NNN-NN/` on `story/*` branches cut from `sprint/S-XX`; protocol §15; `developer.md` Worktree Contract; `.gitignore` entries in both root and scaffold; `#worktree #mcp` flashcard guarding nested-repo footgun. (STORY-013-01, commit `5c789ca`)
- **`state.json` schema v1 + lifecycle scripts.** `constants.mjs`, `init_sprint.mjs`, `update_state.mjs`, `validate_state.mjs`, `validate_bounce_readiness.mjs`, `state.schema.json`. Independent `qa_bounces`/`arch_bounces` counters with auto-escalate at cap=3 (divergence from V-Bounce, documented inline). Atomic write-then-rename; no external deps. (STORY-013-02, commits `a7c01dd` + `3d638e1` fix)
- **`run_script.sh` wrapper + pre-gate scanner.** Stdout/stderr split, diagnostic-block emission, self-repair recipe hooks, Node+TS stack-detection baseline (`gate-checks.json`). `pre_gate_runner.sh qa|arch` short-circuits mechanical failures before agent spawn. (STORY-013-03, commit `adaacbe`)
- **Sprint-context auto-inject.** `.cleargate/templates/sprint_context.md` rendered per sprint at `sprint-runs/<id>/sprint-context.md`; Architect gains `## Adjacent Implementation Check` step to scan merged stories for reusable modules. (STORY-013-04, commit `234b8ed`)
- **Orchestrator interrupt handling.** Circuit breaker in `developer.md` (50-tool-call / 2-consecutive-fail heuristic emitting `*-dev-blockers.md` with Test-Pattern/Spec-Gap/Environment sections); architect.md `## Blockers Triage`; protocol §§16–17 (User Walkthrough `UR:*` events, Mid-Sprint CR Triage `CR:*` categories). (STORY-013-05, commit `c2c80bd`)
- **Close pipeline.** `prefill_report.mjs`, `close_sprint.mjs` (refuses non-terminal; invokes prefill; auto-runs suggest_improvements on close), `suggest_improvements.mjs` (stable `SUG-<sprint>-<n>` IDs, append-only). Reporter agent rewritten against the new template with three-source token-reconciliation contract. (STORY-013-07, commit `e256704`)
- **Architect Sprint Design Review + story granularity fields.** §2 Execution Strategy with merge-ordering from shared-file surface analysis; SPRINT-10 dry-run lives at `.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md` (R7 closure). (STORY-013-09, commit `a512e1a`)
- **Immediate flashcard hard-gate.** `flashcards_flagged` frontmatter field required in dev + QA reports; orchestrator cannot create the next worktree until flagged cards are approved/rejected. Protocol section appended; test harness shipped. (STORY-013-06, commit `9ddd357`; collateral-damage restore `b37ac02`)
- **`execution_mode: v1 | v2` routing flag** on Sprint Plan template + orchestrator gate (STORY-013-08, commit `f8839ec`).

Every story landed on all three surfaces (`cleargate-planning/`, `cleargate-cli/` where applicable, `.cleargate/` live dogfood) — R9 closed on each. `MANIFEST.json` updated on 8 of 9 stories (013-06 touched the scaffold without a MANIFEST bump — benign: only already-tracked files changed).

### Carried Over

None.

---

## §2 Story Results + CR Change Log

### STORY-013-01: Worktree + Branch Hierarchy
- **Status:** Done
- **Complexity:** L3
- **Commit:** `5c789ca`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot. Added `#worktree #mcp` flashcard per R2 mitigation before `.worktrees/` is ever touched in anger. Also carried the sprint seed (EPIC-013, SPRINT-09 file, STORY-013-01..04 files, wiki stubs) — acceptable overlap because the sprint was spawned by this same commit.

### STORY-013-02: state.json Schema + Bounce Counters + Lifecycle Scripts
- **Status:** Done
- **Complexity:** L3
- **Commits:** `a7c01dd` (impl), `3d638e1` (QA-kickback fix)
- **Bounce count:** qa=1 arch=0 total=1
- **CR Change Log:**

  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | `init_sprint.mjs` defaulted `execution_mode: null`; QA kicked back citing SPRINT-09 frontmatter sets `execution_mode: "v1"` and new sprints must default to v1, not null. Fix: `init_sprint` now stamps `"v1"`. | qa_bounces +1 |

- **UR Events:** none
- **Notes:** Bounce resolved in 37 minutes (02:46 impl → 03:23 fix). Counts toward Bug-Fix Tax.

### STORY-013-03: Run Script Wrapper + Pre-Gate Scanner
- **Status:** Done
- **Complexity:** L2
- **Commit:** `adaacbe`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot. Flashcard `#bash #macos #portability` added — `mapfile`/`readarray` are bash-4+ only, rewrote to portable `while IFS=read` under `set -u`. Orchestrator stream-timeout reported during implementation (rescue pattern fired — see §5 Handoffs).

### STORY-013-04: Sprint Context + Adjacent-Impl Check (M1 complete)
- **Status:** Done
- **Complexity:** L2
- **Commit:** `234b8ed`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot. Closes M1. Orchestrator stream-timeout reported during implementation (rescue pattern fired).

### STORY-013-05: Orchestrator Interrupt Handling
- **Status:** Done
- **Complexity:** L3
- **Commit:** `c2c80bd`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot. Defined the event-type vocabulary that §3 below tallies against. Protocol renumbering: architect M1 plan said "§§12-13"; flashcard `#protocol #section-numbering` records that sprint-plan numbering goes stale when a prior sprint has appended to protocol — actual landing was §§16–17 (because §15 = worktree from 013-01).

### STORY-013-06: Immediate Flashcard Hard-Gate
- **Status:** Done
- **Complexity:** L2
- **Commits:** `9ddd357` (impl, with collateral damage), `b37ac02` (collateral-damage restore)
- **Bounce count:** qa=0 arch=0 total=1 (circuit-breaker: environment)
- **CR Change Log:**

  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug (circuit-breaker `environment`) | Developer agent resolved a stash conflict during this story's worktree branch and inadvertently (a) deleted `.cleargate/delivery/pending-sync/SPRINT-06_Admin_UI.md` and (b) reverted `cleargate-cli/src/wiki/parse-frontmatter.ts` to a prior shape. Detected post-commit via git log inspection on `sprint/S-09`. | (circuit-breaker tally +1 environment) |

- **UR Events:** none
- **Notes:** Commit `b37ac02` restored both files; the damaged story itself is Done because the gate behavior shipped correctly. This is the most dangerous class of failure the sprint surfaced — see §5 Process.

### STORY-013-07: Sprint Report v2 + Close Pipeline + Reporter Rewrite
- **Status:** Done
- **Complexity:** L3
- **Commit:** `e256704`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot on a very wide surface (2.6k LOC net). Shipped the fixture at `.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped/` that validates the pipeline against a SPRINT-08-shaped input. **Dogfood:** this very REPORT.md is written against the template shipped in this commit (§DoD bullet 6 closed).

### STORY-013-08: Execution Mode Flag + CLI Wrappers (M2 complete)
- **Status:** Done
- **Complexity:** L2 (per plan; actual surface was ~L3 — 2.0k LOC net with full CLI test coverage)
- **Commit:** `f8839ec`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot. Closes M2. Flag defaults to `v1` — SPRINT-09 behavior unchanged by its own merge. SPRINT-10 is the first candidate for `execution_mode: v2`.

### STORY-013-09: Sprint Planning v2 (Architect Sprint Design Review)
- **Status:** Done
- **Complexity:** L2
- **Commit:** `a512e1a`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** One-shot. R7 closure: SPRINT-10 design-review dry-run written to `.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md`.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 9 |
| Stories shipped (Done) | 9 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Total QA bounces | 1 (013-02) |
| Total Arch bounces | 0 |
| CR:bug events | 2 (013-02 default-mode kickback; 013-06 stash-conflict collateral damage) |
| CR:spec-clarification events | 0 |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 1 (013-06 stash-conflict) |
| **Bug-Fix Tax** | 22% (2/9) |
| **Enhancement Tax** | 0% (0/9) |
| **First-pass success rate** | 78% (7/9 — 013-01/03/04/05/07/08/09 one-shot) |
| Token source: ledger-primary | unassigned (0 rows in `S-09/token-ledger.jsonl`; 1 orchestrator-attributed row in `_off-sprint/token-ledger.jsonl` for EPIC-013 Architect context: input=468 / output=197059 / cache_creation=1173139 / cache_read=34232223 / model=claude-opus-4-7, 223 turns) |
| Token source: story-doc-secondary | N/A — no dev/qa reports were written to `.cleargate/sprint-runs/S-09/reports/` (SPRINT-09 ran on v1; story-doc frontmatter Token Usage is a v2 artifact) |
| Token source: task-notification-tertiary | N/A — no task notifications were persisted |
| Token divergence (ledger vs task-notif) | Not computable — only one source has data |
| Token divergence flag (>20%) | N/A — insufficient sources |

**Bounce ratio (fixup commits / story commits):** 2 / 9 = 22% — both 013-02 and 013-06 required a second commit on the sprint branch.

**Correction tax window:** 013-02 fix took ~37 min; 013-06 restore took ~3 min after detection. Total correction-tax wall-clock: ~40 min on an ~8h47m sprint (~7.6%).

**Budget guardrail (R10):** M1 wall-clock was 02:37 → 09:38 (7h01m); M2 was 09:38 → 11:24 (1h46m). M1 used ~80% of total wall-clock but finished well inside the v2-projected window, so R10's STORY-013-09 defer-trigger did NOT fire. Token budget cannot be asserted against the 1.5M target (see §5 Tooling).

---

## §4 Lessons

### New Flashcards (Sprint Window — all 2026-04-21)

| Date | Tags | Lesson |
|---|---|---|
| 2026-04-21 | #test-harness #scripts #env | close_sprint/suggest_improvements/prefill_report resolve sprint dir from REPO_ROOT by default; add CLEARGATE_SPRINT_DIR env override for test isolation. |
| 2026-04-21 | #protocol #section-numbering | stories drafted before a prior sprint's protocol edits go stale — §§ they cite (e.g. 'append §10') may already be occupied. Architect MUST audit actual current numbering before planning; use next free § after last-shipped section. |
| 2026-04-21 | #bash #macos #portability | macOS ships bash 3.2 as `/usr/bin/env bash`; `mapfile`/`readarray` are bash 4+ only. Under `set -u` the unbound array trips. Use portable `arr=(); while IFS= read -r x; do arr+=("$x"); done < <(cmd)` instead. |
| 2026-04-21 | #mjs #jsdoc #syntax | glob pattern `foo/*/bar` inside a JSDoc block comment in .mjs causes SyntaxError at module load (Node parses `*` as multiply); use `<id>` placeholder instead. |
| 2026-04-21 | #worktree #mcp | never git worktree add inside nested mcp/ repo — edit mcp/ inside the outer worktree; nested-repo worktrees are a git footgun. |
| 2026-04-21 | #recipe #worktree #state-schema | V-Bounce port: state.json lives at `.cleargate/sprint-runs/<id>/state.json` (NOT `.vbounce/state.json`); init default state is "Ready to Bounce" (not "Draft"); auto-escalate on qa_bounces/arch_bounces==3 (V-Bounce does NOT — we diverge). |

Sprint-level DoD target was ≥2; actual 6. Distribution by tag: scripts/env (3), bash/portability (1), worktree (2), protocol-numbering (1), mjs-syntax (1). Lessons cluster around **portability of the shipping scripts** — the framework's own scaffold code hit the same kinds of issues the framework is being built to catch.

### Flashcard Audit (Stale Candidates)

Scanned all active cards against shipped SPRINT-09 surface. Symbol-absence check performed on paths and API names referenced in each card.

| Card (date · lead-tag · lesson head) | Missing symbols | Proposed marker |
|---|---|---|
| (none found) | — | — |

No stale candidates. The two SPRINT-09-adjacent areas most at risk of obsolescence — the `#reporting #hooks #ledger #subagent-attribution` card from 2026-04-19 and the `#reporting #hooks #ledger` card citing `ls -td sprint-runs/*/` — **remain accurate** (see §5 Tooling; the bug is NOT fixed in this sprint). Protocol-section-numbering flashcard reinforces but does not contradict anything prior.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-04-21 `#recipe #worktree #state-schema` | — (no prior card on state.json) | n/a |
| 2026-04-21 `#worktree #mcp` | — (first card on this) | n/a |

No supersede/contradict pairs detected this sprint. The new v2 rules (event-type vocabulary, circuit-breaker categories, three-surface landing) are additive — no existing card contradicts them.

---

## §5 Framework Self-Assessment

### Templates

| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | 013-09 added `parallel_eligible` + `expected_bounce_exposure`; template now carries enough for Architect Design Review input. |
| Sprint Plan Template usability | Yellow | M2 Architect plan (`M2.md` lines 6–7) noted that STORY-013-05..09 files did NOT exist in `pending-sync/` at Gate 2; the orchestrator drafted them mid-sprint from EPIC-013 + SPRINT-09 §Consolidated Deliverables. Under v2, the Sprint Design Review makes this a blocking Gate-2 miss. Under v1 it passed silently — which is exactly the gap v2 closes. |
| Sprint Report template (this one) | Green | Dogfood pass: template structure accepted a SPRINT-09-shaped input without awkwardness. One comment: §3 "Token source" rows assume a three-source ledger — under a known-broken attribution setup (this sprint), they read mostly "N/A" and the token-divergence flag is not meaningful. Future revision could add an "attribution-health" cell. |

### Handoffs

| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | Both M1.md and M2.md plans were consumed without clarifications logged. M2.md flagging "story markdown pending" was itself a handoff win — the plan explicitly said what to draft before dev spawn. |
| Developer → QA artifact completeness | Yellow | Three stream-timeouts (013-02, 013-03, 013-04) required orchestrator rescue mid-implementation — the agent went silent before producing a terminal report. Each rescue succeeded (one-shot on 03 and 04; one bounce on 02). This is a framework stressor: v2's circuit-breaker heuristic (50 tool-calls / 2 consecutive fails) does not catch stream-level silence — a separate liveness gate may be needed. |
| QA → Orchestrator kickback clarity | Green | The single QA kickback (013-02) cited the exact frontmatter line and the exact fix; 37-min resolution wall-clock is well within the 3-strike cap. |

### Skills

| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | 013-06 shipped the immediate-flashcard hard-gate itself, so up to that commit the gate existed only as aspiration. 6 cards landed, all in commits' own files (not post-hoc) — dogfood-worthy. Under v2 the gate will be enforced orchestrator-side from SPRINT-10. |
| Adjacent-implementation reuse rate | Green | `sprint-context.md` surfaced prior-story reuse rows; 013-05 cited `VALID_STATES` / `TERMINAL_STATES` / `update_state.mjs --qa-bounce` rather than redefining; 013-07 built directly on M1 scripts; 013-08 wired `run_script.sh`. No visible reinvention within the sprint. |

### Process

| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Max bounce on any story was 1 (013-02 QA bounce). Cap is 3. No story approached escalation. |
| Three-surface landing compliance | Green | R9 closed on 9/9 stories. `cleargate-planning/` mirrors shipped in the same commit as `.cleargate/` live edits; `cleargate-cli/` surface was exercised in 013-08. MANIFEST.json touched on 8/9 stories (013-06 did not bump MANIFEST — benign because only already-tracked files were edited). |
| Circuit-breaker fires (if any) | Red | One `environment` circuit-breaker event on 013-06 — the developer agent's stash-conflict resolution destroyed two unrelated files (`SPRINT-06_Admin_UI.md`, `parse-frontmatter.ts`). Restored via commit `b37ac02`. **This is the single most important finding this sprint:** a developer agent operating on a branch with stale stashes is a systemic risk, not a one-off. Current mitigation is post-hoc (`git log` on the sprint branch caught it); needed v2 mitigation is a pre-commit scan comparing `git diff --stat` against the story's declared file surface. File an improvement suggestion. |

### Tooling

| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | Baseline shipped in 013-03; Node+TS stack covered; self-repair recipe hooks present. Untested in anger because SPRINT-09 is v1. |
| Token ledger completeness | Red | **SPRINT-09's own ledger (`.cleargate/sprint-runs/S-09/token-ledger.jsonl`) is empty** — zero rows. `_off-sprint/token-ledger.jsonl` has ONE row tagged `agent_type: architect`, `story_id: ""`, `work_item_id: "EPIC-013"`, `session_id: ededd9e9-…`, 223 turns, ~34M cache_read tokens — i.e. the orchestrator's own session, not a subagent. This confirms the 2026-04-19 flashcard `#reporting #hooks #ledger #subagent-attribution`: SubagentStop fires on the orchestrator session, not on subagents, and the sprint-id router is not catching S-09 rows correctly. **Per-story and per-agent cost cannot be computed for this sprint.** Fix before SPRINT-10 — otherwise v2's bounce-ratio / Bug-Fix-Tax metrics will be disconnected from their cost axis. |
| Token divergence finding | N/A — attribution bug blocks source comparison | Only one source (ledger-primary) has any rows, and that row is orchestrator-attributed. Divergence >20% flag cannot be computed; downgrade the §3 cell accordingly. |

### Additional findings (not in template rubric but required by the ask)

- **M2 Gate-2 story-file gap (drafted mid-sprint).** The five M2 stories (013-05..09) did not exist in `pending-sync/` when the Architect wrote M2.md. The plan made this explicit ("Orchestrator must draft the five STORY files before developer spawn") — which is honest, but under v2's Sprint Design Review rule this would be a Gate-2 failure. **Improvement:** `cleargate sprint init` under v2 should assert every story listed in §Consolidated Deliverables has a corresponding `pending-sync/STORY-*.md` file before stamping `execution_mode: v2`.
- **v2 adoption readiness (013-07 DoD bullet).** This sprint's output is complete, internally consistent, and the close pipeline ran against this very sprint (the orchestrator invoked Reporter pre-flip, per the rule). **SPRINT-10 is the correct first v2 sprint** — all M2 scaffolding (event vocabulary, circuit-breaker, close pipeline, design-review) landed; no follow-up unblocks SPRINT-10 v2 beyond flipping its own `execution_mode` frontmatter.

---

## §6 Change Log

| Date | Sha | Title |
|---|---|---|
| 2026-04-21 02:37 | `5c789ca` | feat(EPIC-013): STORY-013-01 worktree + branch hierarchy |
| 2026-04-21 02:46 | `a7c01dd` | feat(EPIC-013): STORY-013-02 state.json + bounce counters + lifecycle scripts |
| 2026-04-21 03:23 | `3d638e1` | fix(EPIC-013): STORY-013-02 default execution_mode to v1 (QA kickback) |
| 2026-04-21 04:35 | `adaacbe` | feat(EPIC-013): STORY-013-03 run_script + pre_gate scanner |
| 2026-04-21 09:37 | `234b8ed` | feat(EPIC-013): STORY-013-04 sprint context + adjacent-impl check (M1 complete) |
| 2026-04-21 10:19 | `c2c80bd` | feat(EPIC-013): STORY-013-05 orchestrator interrupt handling |
| 2026-04-21 10:38 | `e256704` | feat(EPIC-013): STORY-013-07 sprint report v2 + close pipeline |
| 2026-04-21 10:49 | `a512e1a` | feat(EPIC-013): STORY-013-09 sprint planning v2 |
| 2026-04-21 11:05 | `9ddd357` | feat(EPIC-013): STORY-013-06 immediate flashcard hard-gate |
| 2026-04-21 11:08 | `b37ac02` | fix(sprint-09): restore damage from 013-06 stash-conflict resolution |
| 2026-04-21 11:24 | `f8839ec` | feat(EPIC-013): STORY-013-08 execution_mode flag + CLI wrappers (M2 complete) |

| Date | Author | Change |
|---|---|---|
| 2026-04-21 | Reporter agent | Initial generation against sprint_report.md v1 template. |
