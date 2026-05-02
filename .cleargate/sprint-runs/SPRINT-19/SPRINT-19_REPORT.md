---
sprint_id: "SPRINT-19"
status: "Shipped"
generated_at: "2026-05-02T13:15:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- role: reporter — generated 2026-05-02 -->
<!-- Sprint Report v2 Template — template_version: 2 -->

# SPRINT-19 Report: Gate 4 Close + QA Context + Initiative Rename + Token-Ledger Spike

**Status:** Shipped
**Window:** 2026-05-01 to 2026-05-02 (~13 hours wall, single calendar day push)
**Stories:** 4 anchors / 13 milestones planned · 4 anchors / 13 milestones shipped · 0 carried over

> Sprint 3 of 3 of the SDLC redesign trilogy. Closes out the charter §2.4 commitment with a deterministic Gate-4 close pipeline (CR-022), a structured QA context handoff (CR-024), the legacy Proposal → Initiative rename (CR-025), and a diagnosis-only token-ledger spike (BUG-024) that scopes the SPRINT-20 fix as CR-026.

---

## §1 What Was Delivered

### User-Facing Capabilities
- **Deterministic sprint close.** `cleargate sprint close` now hard-blocks on un-removed worktrees (Step 2.7) and any sprint commit that is not yet on `main` (Step 2.8) before flipping `sprint_status` to Completed. The orchestrator can no longer accidentally close a sprint with detached state.
- **Verbose post-close handoff.** Step 8 now prints a 6-item checklist (`improvement-suggestions.md`, `REPORT.md`, doc-refresh checklist, FLASHCARD audit, lifecycle reconciler results, suggested next-sprint anchors) so the conversational agent has a single anchor to read after Reporter ack.
- **`--allow-wiki-lint-debt` waiver flag.** Sprint close no longer hard-fails on the 34 pre-existing wiki broken-backlink findings; the flag emits the failures to log + continues. Batch fix deferred to SPRINT-20.
- **Initiative replaces Proposal.** `templates/proposal.md` deleted; `templates/initiative.md` is the new stakeholder-input shape with a 6-section structure (User Flow / Diagrams / End-to-End Verbal Description / Business Outcome / Success Criteria / Open Questions for AI Triage). `cleargate_pull_initiative` MCP wire flow documented.
- **Lane-aware QA context handoff.** New `prep_qa_context.mjs` script generates a structured ≤20KB context bundle per Developer→QA dispatch, with per-lane playbooks (doc-only / standard / runtime). Targets the SPRINT-18 finding that QA cycles bounced three times on missing DoD §4.1 tests.

### Internal / Framework Improvements
- **`lib/report-filename.mjs` shared helper extracted** (M1, CR-022 M0). Frozen API `reportFilename(sprintDirPath, sprintId, opts) → string` consumed by `close_sprint.mjs`, `suggest_improvements.mjs`, and `prep_reporter_context.mjs`. Removes the 3-way duplication that drifted in SPRINT-18.
- **`sprint_trends.mjs` stub** (M6, CR-022 M3). Wired into Step 6.5 of the close pipeline; full implementation deferred to CR-027.
- **Steps 6.5/6.6/6.7 added to close pipeline:** Skill Candidate detection, FLASHCARD cleanup pass, sprint-trends stub.
- **Reporter context bundle cap raised** from 80 KB to 160 KB (M7, CR-022 M5). This sprint's bundle is 226 KB — still over cap but no longer hard-failing; advisory warning surfaced.
- **Dev STATUS=done structured schema** (M8, CR-024 S2) replaces freeform Developer→QA handoff strings; QA agent definition gains a `Lane Playbook` section keyed off the new schema.
- **Protocol + CLAUDE.md + reporter.md prose audited** (M9, M12) — zero `[Pp]roposal` hits remain outside the §11.4 archive carve-out; Gate-4-class language locked.
- **`vitest.config.ts` forks pool capped at 2** (commit `174a479`, mid-sprint emergency) after a 30 GB orphan-RAM blowout from parallel agent runs.

### Carried Over
- None. All 4 anchors landed `state: Done` in `state.json`. BUG-024 ships as diagnosis-only (its design intent); CR-026 is filed for SPRINT-20.

---

## §2 Story Results + CR Change Log

### BUG-024: Token-Ledger Attribution Spike (investigation-only)
- **Status:** Done
- **Complexity:** L1 (investigation, no production code)
- **Commit:** `ddd92db` (lifecycle reconcile archive; no implementation commit — spike output is the file body itself)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None.
- **UR Events:** None.
- **Output:** 3-defect root-cause analysis (session-ID mismatch in dispatch-marker writer/reader; SessionStart-banner-poisoned transcript-grep fallback; manual `write_dispatch.sh` discipline gap) + ~50 LOC dead-code finding (`.pending-task-*.json` reader). CR-026 fix scope sized at ~100 LOC across 3 surfaces. Dogfood evidence: this very sprint's 26-row ledger reproduces the bug exactly — 100% of rows attribute to `BUG-004 / architect`.

### CR-022: Gate 4 Close Pipeline Hardening (6 milestones M0/M1/M2/M3/M4/M5/M6 → sprint M1/M4/M5/M6/M7/M11/M12)
- **Status:** Done
- **Complexity:** L1+L2 mix (M0/M5/M4/M6 = L1; M1/M2/M3 = L2)
- **Commits:** `be2ef63` (M0), `f43ceb3`+`cec4135` (M1/Step 2.7), `ee21863` (M2/Step 2.8), `4aa8ee4`+`83d117a` (M3/Steps 6.5-7), `f26aea0`+`d73642a` (M5/cap+flag), `2ca2ddc`+`303a13d` (M4/Step 8), `4252912`+`9b99ba0` (M6/protocol)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None during execution.
- **UR Events:** None.
- **Notes:** All 6 milestones merged in the planned order (M1 → M4 → M5 → M6 → M7 → M11 → M12). M1 froze the helper API before any Wave 2 dispatch consumed it; no API drift observed.

### CR-024: QA Context Pack + Lane Playbook (2 stories S1/S2 → sprint M2/M8)
- **Status:** Done
- **Complexity:** L2 (both stories)
- **Commits:** `d8cadf4`+`587bdb2` (S1/script+schema), `5190b10`+`e935289` (S2/dev schema + QA playbook)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None.
- **UR Events:** None.
- **Notes:** New file `.cleargate/scripts/prep_qa_context.mjs` shipped Wave 1; QA agent definition + Developer STATUS=done schema landed Wave 2 with no rework. Schema introduces a `lane: doc-only | standard | runtime` field that `state.json` schema does not yet support — flagged for SPRINT-20 (CR-024 introduces lane semantics; M2 passes it through; the state.json upgrade is deferred).

### CR-025: Initiative Rename + MCP Pull Flow (3 stories S1/S2/S3 → sprint M3/M9/M10)
- **Status:** Done
- **Complexity:** L1 (all three)
- **Commits:** `d67f501`+`8387311` (S1/template rewrite + delete), `7aa408f`+`bb36582` (S2/protocol + agent prose), `429af61`+`a0367b8` (S3/MCP pull-flow doc + PROPOSAL archive)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None.
- **UR Events:** None.
- **Notes:** PROPOSAL-008 + PROPOSAL-009 archived as part of S3. Pre-grep before S2 dispatch confirmed `developer.md` + `qa.md` had zero `[Pp]roposal` hits, so M9 scope correctly excluded those two files (they were touched by M8 instead — disjointness preserved).

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 4 anchors / 13 milestones |
| Stories shipped (Done) | 4 anchors / 13 milestones |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (state.json shows all 4 anchors `lane: standard` — three milestones M7/M10/M11 were sprint-plan-classified `fast` but state.json lane is per-anchor not per-milestone; effective fast share at the milestone level: 3/13 = 23%) |
| Fast-Track Demotion Rate | 0% (no LD events) |
| Hotfix Count (sprint window) | 0 (window 2026-05-01 23:54Z → 2026-05-02 13:10Z; `wiki/topics/hotfix-ledger.md` shows HOTFIX-001 merged 2026-04-30, outside window) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 0 |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 0 |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 1 (vitest forks-pool RAM blowout — emergency cap commit `174a479` mid-sprint) |
| **Bug-Fix Tax** | 0% (0 bug events / 4 anchors × 100) |
| **Enhancement Tax** | 0% (0 UR:review-feedback / 4 anchors × 100) |
| **First-pass success rate** | 100% (state.json: all 4 anchors qa_bounces=0 AND arch_bounces=0). **Caveat:** see §6 Process — this metric is Yellow because (a) state.json bounce counters are anchor-level not milestone-level, masking any per-milestone friction, and (b) SPRINT-18's same caveat applies: orchestrator-side recoveries (watchdog stalls, Edit-tool denies, RAM blowouts — all observed this sprint per the input bullets) are not recorded as bounces. |
| Token source: ledger-primary | 93,585,288 tokens (input 18,934 / output 456,356 / cache_creation 1,467,833 / cache_read 91,642,165) |
| Token source: story-doc-secondary | N/A — `draft_tokens` blocks across BUG-024/CR-022/CR-024/CR-025 frontmatter all show `input: null / output: null / sessions: []`. The `stamp-frontmatter` step on BUG-024 emitted `stamp_error: no ledger rows for work_item_id BUG-024` — a downstream symptom of the BUG-024 attribution defect itself. |
| Token source: task-notification-tertiary | N/A — orchestrator did not capture task-notification totals this sprint. |
| Token divergence (ledger vs task-notif) | unmeasurable (tertiary source missing) |
| Token divergence flag (>20%) | NO (only one source available — see §6 Tooling for the underlying root-cause: BUG-024) |
| **Cost (rough USD, rates as of 2026-04)** | **~$199.49** (input @$15/MT $0.28 + output @$75/MT $34.23 + cache_creation @$18.75/MT $27.52 + cache_read @$1.50/MT $137.46). Rates: Opus pricing as of 2026-04. **Caveat:** all 26 ledger rows attribute to a single (BUG-004, architect) pair due to BUG-024 defect — per-agent / per-story / per-milestone cost breakdown is unrecoverable. |
| Per-agent breakdown (from bundle digest) | architect: 91,940,090 tokens / 25 dispatches; developer: 1,645,198 / 1 dispatch. **All attribution incorrect** — actual sprint dispatched ≥13 Developer agents + ≥8 Architect agents + ≥13 QA agents + 1 Reporter; ledger reflects orchestrator-session attribution only. |
| Wall time | ~13h 16m (first ledger row 2026-05-01T19:03:45Z → last 2026-05-02T09:00:41Z, single calendar day) |

---

## §4 Observe Phase Findings

Observe phase: no findings.

<!-- The sprint-plan §4 Execution Log table is empty (lines 145-150 of the source plan show header-only).
     No UR:bug rows, no hotfixes triggered in window, no UR:review-feedback rows captured between
     last-merge (9b99ba0 @ 2026-05-02T~12:00Z) and Reporter dispatch (2026-05-02T13:12Z).
     Per template: skip the section entirely with the single-line replacement above. -->

---

## §5 Lessons

### New Flashcards (Sprint Window)

Three flashcards landed during the SPRINT-19 window. The fourth (`#cli #sprint #scripts`, 2026-05-01) predates the sprint Ready→Active flip but is conceptually part of the SPRINT-19 work-up; included for completeness.

| Date | Tags | Lesson |
|---|---|---|
| 2026-05-02 | #worktree #git #commit | Dev agent's `git commit` landed on `main` instead of `story/<id>` branch — verify post-dispatch with `git log story/<id>` not just commit-success-claim. |
| 2026-05-02 | #vitest #ram #parallel-agents | vitest maxForks cap is PER-PROCESS — N parallel agents × maxForks = total forks (e.g. cap=2 + 3-agent wave = 6 forks ≈ 2.4GB). Lower VITEST_MAX_FORKS=1 or serialize agents on tight-RAM laptops. |
| 2026-05-02 | #vitest #ram #pool | Cap forks pool via vitest.config.ts `poolOptions.forks.maxForks=2` — CLI flag `--pool-options.forks.maxForks=N` collides with tinypool minThreads validation when pool=forks. |
| 2026-05-01 | #cli #sprint #scripts | `cleargate story start <id>` requires CLEARGATE_STATE_FILE env — run_script.sh omits it; without it step 2 fails. |

**Reporter recommendation:** SPRINT-19 produced at least 3 additional lesson-worthy events that did not get carded:
1. Dev-agent watchdog stalls at 600s — orchestrator-side recovery pattern (no flashcard yet; recommend tag `#orchestrator #watchdog #recovery`).
2. Edit-tool deny on `.claude/agents/*.md` for some Dev agents — workaround was Bash+sed (no flashcard yet; recommend tag `#agents #edit-deny #workaround`).
3. Reporter context bundle exceeded raised 160KB cap (226KB) on first dogfood — sprint plan §2.2 trim opportunity flagged but not carded (recommend tag `#reporter #bundle #trim`).

Append before SPRINT-20 starts so the loop can absorb them.

### Flashcard Audit (Stale Candidates)

Time-budgeted spot audit (5 active cards sampled, not exhaustive — full audit deferred to a dedicated cleanup pass per the sustained backlog):

| Card (date · lead-tag · lesson head) | Missing symbols | Proposed marker |
|---|---|---|
| 2026-04-19 · #wiki #yaml · `parseFrontmatter stores nested YAML as opaque string` | (already marked `[R]` in source) — verify | already `[R]` |
| 2026-04-19 · #yaml #frontmatter · hand-rolled parser | (already marked `[R]` in source) — verify | already `[R]` |
| 2026-04-19 · #reporting #hooks #ledger · `token-ledger.sh routes via ls -td` | `ls -td sprint-runs/*` still present in `.claude/hooks/token-ledger.sh` (verified) | active — keep |
| 2026-04-19 · #reporting #hooks #ledger #subagent-attribution · SubagentStop hook fires on orchestrator session | confirmed still active by SPRINT-19's own ledger (BUG-024 reproduces) | active — keep |
| 2026-04-21 · #cli #sprint-close #assume-ack · CLI handler doesn't pass through `--assume-ack` | symbol `--assume-ack` still present in `close_sprint.mjs`; CLI wrapper status: not re-verified this sprint | active — keep, re-verify SPRINT-20 |

No cards proposed for `[S]` marker on this pass. Full stale-detection deferred (200+ active cards × symbol-grep is out of Reporter's bundle budget; recommend a dedicated cleanup story).

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-05-02 · #vitest #ram #pool (forks-cap via vitest.config.ts) | 2026-05-01 · #vitest #leak #posttest (`pkill -f vitest` after every run) | keep both — they address adjacent symptoms (cap during run vs cleanup after run); superseding either would lose the other half of the lesson |

No supersede actions recommended this sprint.

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | No gap surfaced. CR template usage on 3 anchors clean. |
| Sprint Plan Template usability | Green | `<instructions>` block + §0 Stakeholder Brief shipped SPRINT-18 dogfooded again here. The `parent_cleargate_id: null` + `sprint_cleargate_id: SPRINT-19` frontmatter convention worked. |
| Sprint Report template (this one) | Yellow | The §3 Fast-Track Ratio row asks for one number but `state.json` lane is anchor-level while sprint-plan lane is milestone-level — produces a contradiction (0% anchor-level vs 23% milestone-level). Recommend a future template revision: split into two rows or pick the milestone-level convention. |
| `templates/initiative.md` (new) | Green | Replaces `proposal.md` cleanly; 6-section structure landed; pull-flow documented. First Initiative push will exercise it in SPRINT-20+. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | All 8 milestone plans (M1-M8) present in `plans/`; M9-M12 plans absent — likely because M9-M12 are short prose-update milestones that the orchestrator dispatched directly with the CR file as the brief. Acceptable for L1 doc work; document the convention in Architect agent definition next sprint. |
| Developer → QA artifact completeness | Green | Zero kickbacks across 13 milestones. CR-024's new Dev STATUS=done schema (shipped M8) was self-applied during M11/M12 with positive effect. |
| QA → Orchestrator kickback clarity | Green (vacuous) | No kickbacks fired. The new lane playbook (M8) is not yet stress-tested at scale; SPRINT-20 will be the real test. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | 4 cards landed in window (3 vitest-related, 1 CLI-state). 3 additional lesson-worthy events (watchdog stalls, Edit-tool deny, bundle-size overshoot) did NOT get carded during sprint. Same Yellow as SPRINT-18 — append-during-sprint discipline is consistently weak. |
| Adjacent-implementation reuse rate | Green | M1 helper extraction is the textbook reuse story: one new file, three call sites consolidated, no duplication regression. CR-022's milestone structure was deliberate practice of this pattern. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | All 4 anchors landed at qa=0 arch=0 in `state.json`. No 3-bounce escalations. **Caveat (carries from SPRINT-18):** state.json bounce counters do NOT capture orchestrator-side recoveries — Dev-agent watchdog stalls, Edit-tool denies, and the RAM-blowout emergency commit `174a479` would all be ≥1 bounce in a stricter accounting. Real friction is masked. |
| Three-surface landing compliance | Green | Mirror parity holds: every live-side touch on `.cleargate/scripts/`, `.claude/agents/`, `.claude/hooks/`, `CLAUDE.md`, `.cleargate/knowledge/`, and `.cleargate/templates/` matched a `cleargate-planning/` mirror edit in the same commit. `MANIFEST.json` regenerated as part of the merge waves. |
| Circuit-breaker fires (if any) | Yellow | One environment-class fire: vitest forks-pool RAM blowout, fixed in-flight at commit `174a479` (chore mid-sprint, not a milestone). Generated 2 new flashcards (#vitest #ram #pool, #vitest #ram #parallel-agents). The fix is a config-file cap; underlying tinypool worker-leak issue is a known carry-forward. |

### Lane Audit

Three milestones shipped under `lane: fast` per the sprint plan §2.4 audit. State.json lane field is anchor-level only (all 4 anchors = `standard`), so the per-milestone fast-lane data is reconstructed from the sprint plan + git diff rather than `state.json`.

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `CR-022 M5` (M7) | 3 (sprint.ts + 2 mirrors) | ~50 | n | _human fill_ | Constant raise + new flag; mechanical. |
| `CR-025 S3` (M10) | 5 (MCP pull-flow doc + PROPOSAL-008/009 + 2 mirrors) | ~80 | n | _human fill_ | Doc + 2 file moves. |
| `CR-022 M4` (M11) | 4 (close_sprint.mjs + canonical + tests) | ~40 | n | _human fill_ | Single stdout block. |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

Rolling 4-sprint hotfix count (SPRINT-16 / SPRINT-17 / SPRINT-18 / SPRINT-19): **0 / 0 / 0 / 0**. The single hotfix in `wiki/topics/hotfix-ledger.md` (HOTFIX-001, BUG-018 follow-up, merged 2026-04-30) sits inside SPRINT-17/18 transition, but neither sprint's REPORT.md attributes it to its own window — same window-attribution gap noted in SPRINT-18's report. **Trend: stable at 0. Monotonic-increase flag: NO.**

### Tooling
| Item | Rating | Notes |
|---|---|---|
| `run_script.sh` diagnostic coverage | Yellow | FLASHCARD 2026-05-01 `#cli #sprint #scripts` documents that `run_script.sh` omits `CLEARGATE_STATE_FILE` for `cleargate story start`. Workaround in place; permanent fix not picked up in SPRINT-19 scope. |
| Token ledger completeness | **Red** | **Carries forward from SPRINT-04+; now diagnosed.** All 26 SPRINT-19 ledger rows attribute to `(BUG-004, architect)` — same pattern as SPRINT-15/16/17/18. BUG-024 (this sprint) ships the root-cause analysis: 3 defects + ~50 LOC dead code. CR-026 in SPRINT-20 lands the fix. |
| Token divergence finding | N/A | Only the primary source (ledger) yielded numbers this sprint. Story-doc and task-notification sources are blank for the same root cause as the ledger Red. |
| Reporter context bundle cap | Yellow | Cap raised 80KB → 160KB this sprint (M7). This sprint's bundle came in at 226KB — over the new cap. Advisory warning fired; close did not block. Recommend trimming sprint-plan §2.2 in-place at SPRINT-20 init or a `--max-bundle-kb` flag with a hard ceiling. |
| Wiki-lint debt waiver path | Yellow | `--allow-wiki-lint-debt` flag (M7) provides the waiver path. 34 broken-backlink findings remain pre-existing; batch-fix deferred to SPRINT-20 (CR-028 candidate or hotfix). |
| Dev-agent watchdog stalls | Red (carries) | Multiple Dev agents stalled at 600s watchdog ceiling during execution; orchestrator-side recovery (mechanical grep+diff substitute) saved each dispatch but is one-shot. Same finding as SPRINT-18. CR-024's lane playbook helps QA but does NOT address Dev watchdog. Candidate for SPRINT-20 sizing. |
| Edit-tool deny on `.claude/agents/*.md` | Yellow | Some Dev agents hit Edit-tool deny when trying to write to `.claude/agents/developer.md` / `qa.md`; orchestrator workaround was Bash+sed direct apply. Pattern is reproducible; needs documentation in agent definitions or a permissions audit. |
| Mirror coverage of `prep_reporter_context.mjs` | Yellow | M7 Option B accepted: live-only script with no canonical mirror at `cleargate-planning/.cleargate/scripts/`. Carried forward as a known gap; revisit if SPRINT-20+ hits a parity issue. |
| `state.json` schema lane support | Yellow | CR-024 introduced `lane: doc-only \| standard \| runtime` semantics in the QA context schema; M2 passed it through but `state.json` lane field is still binary `standard \| fast`. SPRINT-20 should land the schema upgrade. |
| Pre-existing admin/+mcp/ vitest failures | Yellow (carries) | ~5-7 failing test files (mcp/ subrepo absent in worktrees, snapshot drift, hotfix-new). Out of SPRINT-19 scope. SPRINT-20 infra-cleanup hotfix candidate. |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-02T13:15:00Z | Reporter agent | Initial generation. |
