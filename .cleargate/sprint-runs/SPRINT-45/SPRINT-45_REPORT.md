---
sprint_id: "SPRINT-45"
status: "Draft"
generated_at: "2026-11-14T13:05:00Z"
generated_by: "Reporter agent (role: reporter)"
template_version: 2
---

# SPRINT-45 Report: Measured Loop and Safe Upgrade

**Status:** Shipped (all six items Done on cli `main`; local merges only, nothing pushed or published)
**Window:** 2026-11-14 to 2026-11-14 (1 calendar day)
**Stories:** 6 planned / 6 shipped / 0 carried over

Sprint range on cli main: `dbccc79..f846d9a` (58 files, +6024/-192, nine first-parent merges). The Reporter bundle was built by the pre-sprint `prep_reporter_context.mjs` (this repo's live loop is frozen until the dispenser_adapter field trial, rule 9), so the `## Measured Metrics` rows below come from the canonical bundle `evidence/STORY-064-02/SPRINT-45.reporter-context.canonical.md` (schema 1, generated 2026-11-14T12:52:57Z).

---

## §1 What Was Delivered

### User-Facing Capabilities
- **Rework and cost now come from the host's transcripts and git.** `sprint_metrics.mjs` derives per-item rework rounds (red / dev / verify), git rework commits, wall time, tokens and an unattributed share from subagent transcripts plus git, read-only and never failing a close (STORY-064-01, CR-120, STORY-064-02; merges `681cb7c`, `8ea7218`, `9cd1402`, `9462dcf`).
- **The sprint report reads that measurement.** The v2 template and `prep_reporter_context.mjs` add a `## Measured Metrics` section; this report's §3 is the first to fill from it (STORY-064-02).
- **`cleargate upgrade` is safer on customised repos.** The dry run lists only files that change plus one `N unchanged (not listed)` line, and names files whose local edits it replaces (BUG-133, `169480e`). `settings.json` keeps its hook order and the user's own groups on upgrade (BUG-134, `6ad41e8`). `gate-checks.json` is judged on what upgrade leaves behind, so the false "local edits lost / replaced" labels are gone (BUG-133 r2, `8de3d7c`).

### Internal / Framework Improvements
- CR-120: per-dispatch `subagent-ledger.jsonl`, including workflow-run transcripts; Codex companions regenerated (`gen:codex`); hook snapshot lock moved to `token-ledger.cr-120.sh`.
- BUG-117: pricing table re-grounded for Claude 5 models (Fable 5.2, Haiku 5.5, Sonnet 5.5 cache read 0.10) and Opus 4.7 / Haiku 4.5 corrected (`cd54e93`, fast lane).
- D.5 consolidation by `code-simplifier` (`f846d9a`, 4 files +46/-45): single local-edits check, shared `gateCommandsOf`, one `compareStrings` helper; QA PASS, suite identical to `8de3d7c`.
- Contracts C1 (`contract/S-45-ledger`) and C2 (`contract/S-45-metrics`) were frozen before build (CR-124 pattern); no C2 key was renamed or retyped.

### Carried Over
- Stories: none.
- Carried findings (not roster items): R4 files post-merge rounds as `post_merge` (see §4/§6); `test_close_sprint_v21` Scenario 10 is stale and 105 integration reds predate the sprint and are unlisted; Reporter bundle ~197 KB vs 160 KB budget (deferred with owner sign-off); OpenRouter pricing-refresh CR to be drafted after close.
- Not done by design: no live re-sync at Gate 4. It follows the dispenser_adapter verdict (RC installed there after its SPRINT-03 closes). Live-vs-canonical drift (six canonical files, doctor scaffold-drift lines, parity reds 5a/5d, `sprint-execution-mirror`, `template-stubs.integration:211`) is **expected**, not a defect (rules 9 and 17).

---

## §2 Story Results + CR Change Log

### CR-120: Per-dispatch subagent ledger including workflow runs
- **Status:** Completed
- **Complexity:** not recorded in bundle
- **Commit:** `681cb7c` (31 files, +1740/-37)
- **Bounce count:** qa=0 arch=0 total=0 (measured rework 0)
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | C-1: red file name, hook snapshot lock to `token-ledger.cr-120.sh`, Test 20 re-scoped, three whitelist rows | none |
  | 2 | CR:spec-clarification | Holdout recount amended R4/CR-120 before build ("dispatches minus one" overcounts ~4x) | none |
- **UR Events:** none. QA PASS 6/6. DevOps ran 16 min vs 5 budget (ran-long).

### STORY-064-01: Per-item metrics derived from transcripts and git
- **Status:** Completed
- **Complexity:** L2
- **Commit:** `8ea7218`; r2 `9462dcf`
- **Bounce count:** qa=0 arch=0 total=0 (measured rework 1: red; git 4)
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | C-2, SC-3 (R10 totals/share definition) | none |
  | 2 | CR:spec-clarification | SC-4: sprint-level R3 widened after SPRINT-44 smoke gave share 0.0915; rework round before merge | none |
  | 3 | CR:spec-clarification | SC-5 (window every dispatch; S02 read 0.481) and SC-6 (planned passes per item; S01 read 6 not 4), found after merge, fixed on `story/STORY-064-01-r2` | none |
- **UR Events:** none. Plan deviation accepted: `matchItem` takes the union of full-ID and short-form candidates. SC-4..SC-6 were informed by SPRINT-44 and dispenser S01/S02; dispenser S03 stayed the untuned check.

### STORY-064-02: Sprint report reads derived metrics
- **Status:** Completed
- **Complexity:** L2
- **Commit:** `9cd1402` (6 files, +551/-11)
- **Bounce count:** qa=0 arch=0 total=0 (measured rework 1: dev; git 0)
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | SC-1 (missing ledger warns, falls back to git, never exit 1), SC-2 (two extra red files) | none |
- **UR Events:** none. QA PASS 4/4; Measured Metrics section 1.4 KB.

### BUG-117: Price Claude 5 models
- **Status:** Completed (fast lane)
- **Complexity:** not recorded in bundle
- **Commit:** `cd54e93` (2 files, +46/-36)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Kickoff: table re-grounded against the claude-api reference cached 2026-11-03; outline now seven rows | none |
- **UR Events:** none. QA PASS 8/8.

### BUG-133: Upgrade output hides lost local edits
- **Status:** Completed
- **Complexity:** not recorded in bundle
- **Commit:** `169480e` (6 files, +927/-74); r2 `8de3d7c` (3 files, +357/-18)
- **Bounce count:** qa=0 arch=0 total=0 (measured rework 0; git 3 from the post-merge r2 round)
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | C-3: dry run omits unchanged files; merge-3way local-edit labels | none |
  | 2 | CR:spec-clarification | SC-7 (walkthrough): gate-checks.json judged on what upgrade leaves behind; gate-command fields never local edits | none |
  | 3 | CR:spec-clarification | r2 scenario 2 required a label that contained the string it forbade; spec corrected to `overwritten, local edits lost`; QA-Red re-scoped one assertion | none |
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:bug | gate-checks.json shown as "local edits lost / replaced" though its values are kept (goal check b finding) | Bug-Fix Tax +1; fixed in-sprint as BUG-133 r2 |

### BUG-134: Keep settings.json hook order on upgrade
- **Status:** Completed
- **Complexity:** not recorded in bundle
- **Commit:** `6ad41e8` (5 files, +619/-17)
- **Bounce count:** qa=0 arch=1 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | C-4: `mergeUpstreamSettings` on upgrade's take path only | none |
  | 2 | CR:approach-change | Architect post-flight FAIL on `e4a4094`: PF-2 group folding moved user groups into ClearGate's, PF-3 dedupe dropped command-less hooks; QA-Red re-scoped (3, 3b, 3c, 9b), Developer reworked (`26384c7`), re-check PASS | arch_bounces +1 |
- **UR Events:** none. Accepted edge: a user group that sat before ClearGate's same-key group moves after it.

---

## §3 Execution Metrics

Rework, first-pass and cost rows below are filled from the bundle's `## Measured Metrics` section (canonical bundle, `sprint_metrics.mjs --json`, schema 1, 1 session, 43 dispatch rows, 3 repos). Orchestrator window tokens come from the live bundle's `## Token Ledger Digest`.

| Metric | Value |
|---|---|
| Stories planned | 6 |
| Stories shipped (Done) | 6 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 16.7% (1 of 6: BUG-117) |
| Fast-Track Demotion Rate | 0% (0 of 1) |
| Hotfix Count (sprint window) | 0 (hotfix-ledger.md has no row dated 2026-11) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 0 |
| Total Arch bounces | 1 |
| Rework rounds (measured) | 4 (BUG-134 2, STORY-064-01 1, STORY-064-02 1) |
| Git rework commits (measured) | 9 (STORY-064-01 4, BUG-133 3, BUG-134 2) |
| CR:bug events | 0 |
| CR:spec-clarification events | 15 (as logged in sprint §6 and context amendments; none move a counter) |
| CR:scope-change events | 0 in-sprint (OpenRouter pricing refresh is a CR to be drafted after close) |
| CR:approach-change events | 1 (BUG-134) |
| UR:bug events | 1 |
| UR:review-feedback events | 2 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 (one Developer stop on a spec gap, BUG-133 r2, resolved as CR:spec-clarification) |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 16.7% (1 UR:bug / 6) |
| **Enhancement Tax** | 33.3% (2 / 6) |
| **First-pass success rate** | 50.0% (3 of 6 items with measured rework 0: BUG-117, BUG-133, CR-120) |
| First-pass success rate (state.json counters) | 83.3% (5 of 6; BUG-134 has arch_bounces=1) |
| Subagent tokens (measured) | 76,802,368 tokens (43 dispatches; 6 sprint-level dispatches hold 43,846,819 of these) |
| Unattributed share (measured) | 5.6% (3 dispatches, 4,309,088 tokens) |
| Orchestrator window tokens (ledger) | 1,876,798,197 tokens (live bundle; the canonical bundle built 3 min earlier shows 1,664,452,873) |
| Token source: ledger-primary | 1,876,798,197 tokens (not reconcilable, see below) |
| Token source: story-doc-secondary | N/A (no `token_usage` fields found in the bundle) |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs task-notif) | N/A |
| Token divergence flag (>20%) | YES (ledger work vs session total, see below) |

Per-item measured table (from Measured Metrics; rework is red/dev/verify/total):

| Item | Dispatches | Rework | Git rework | Wall time | Tokens |
|---|---|---|---|---|---|
| BUG-117 | 3 | 0/0/0/0 | 0 | 29m | 1,621,728 |
| BUG-133 | 9 | 0/0/0/0 | 3 | 49m | 7,433,143 |
| BUG-134 | 7 | 1/1/0/2 | 2 | 49m | 6,705,235 |
| CR-120 | 4 | 0/0/0/0 | 0 | 39m | 5,137,651 |
| STORY-064-01 | 7 | 1/0/0/1 | 4 | 49m | 5,616,451 |
| STORY-064-02 | 4 | 0/1/0/1 | 0 | 7m | 2,132,253 |

Disagreements named by the bundle (the only place a state.json counter is cited):
- BUG-133: derived 0, git 3, state.json counter 0. The git rework is the post-merge walkthrough round (r2); R4 files a dispatch after an item's first merge as `post_merge`, never a round.
- BUG-134: derived 2, git 2, state.json counter 1 (derived counts the QA-Red re-scope and the Developer rework; the counter holds only the Architect FAIL).
- STORY-064-01: derived 1, git 4, state.json counter 0 (r2 was post-merge).
- STORY-064-02: derived 1, git 0, state.json counter 0.

**Three-source token reconciliation (CR-035).**
```
Token cost (sprint work, dev+qa+architect, ledger): 1,876,798,197  (not trusted, see attribution refusal)
Token cost (Reporter analysis pass):                TBD — see token-ledger.jsonl post-dispatch
Token cost (sprint total, .session-totals.json):    214,472,428
Subagent tokens (measured, transcripts):            76,802,368
```
The session-totals file has one session (input 2,042 / output 1,229,839 / cache_creation 3,247,942 / cache_read 209,992,605). The ledger "work" figure is 8.7x the session total, so the divergence flag is YES. The measured subagent figure is the one to read for cost.

**Attribution refusal (BUG-069).** The ledger census has `agent_type: unattributed` on 15 dispatches carrying 1,795,806,833 of 1,876,798,197 tokens (95.7%), plus two agent types with 0 tokens (`general-purpose`, `code-simplifier:code-simplifier`). No per-agent cost table is published. The finding is the census: no dispatch marker was written for those dispatches (workflow and sprint-stage dispatches the old hook could not attribute). Historical rows were not touched.

**Cost (USD):** not computed. Per-agent attribution is refused and the ledger total does not reconcile to the session total; the measured 76.8M subagent tokens are not priced here because no verified model mix is in the bundle (pricing table was itself changed by BUG-117 this sprint).

---

## §4 Observe Phase Findings

### 4.1 Bugs Found (UR:bug)
| Date | Description | Resolution | Commit |
|---|---|---|---|
| 2026-11-14 | `upgrade --dry-run` labelled `gate-checks.json` "overwritten, local edits lost" and `--yes` printed "(local edits replaced)" though the repo's gate commands are kept (dispenser copies byte-identical, or only empty values filled) | Fixed in-sprint, owner OK ("i'll go with what you recommend"): BUG-133 r2 under SC-7. Re-run of goal check (b) shows no "local edits lost" line on either clone | `8de3d7c` |

### 4.2 Hotfixes Triggered
| ID | Trigger | Resolution | Commit |
|---|---|---|---|
| (none) | — | — | — |

### 4.3 Review Feedback (UR:review-feedback)
| Date | Description | Status (folded / deferred) | Deferred to / Rationale |
|---|---|---|---|
| 2026-11-14 | dispenser SPRINT-02 `unattributed.share` 0.075 against the 0.05 bar: four SPIKE-001 prototype dispatches share the session and window, and the holdout also lists them as non-sprint | Accepted as measured; no rule change | Goal check 1 reports partial on S02 (see Brief) |
| 2026-11-14 | Reporter bundle ~197 KB vs 160 KB budget (over before this sprint; Measured Metrics adds ~1.4 KB) | Deferred | A later sprint |

Other observations (signal log):
- **R4 hides walkthrough rework.** Post-merge rounds read as derived 0; BUG-133 r2 and STORY-064-01 r2 show only through git. Recommendation for a later CR: count walkthrough rounds separately in the report.
- **Test debt.** `test_close_sprint_v21` Scenario 10 still expects `prep_reporter_context.mjs` to exit 1 on a missing ledger (untrue since BUG-081, already red at `dbccc79`). 105 integration tests were red before the sprint and unlisted because `npm test` skips `*.integration.node.test.ts`. D.5 ran all 104 integration files: 111 failing tests, an identical set at `8de3d7c` and `7d93c52`. Largest groups: `codemod-vitest-to-node-test.red` 27, `bootstrap-root` 25 (Postgres), `admin-vitest-conversion.red` 6, `readme-qa-doc-truth` 5.
- **SPRINT-45's own share is 5.6%** (3 unattributed dispatches), above the 0.05 bar used for goal check 1, though that bar names other sprints.
- **Flakes seen once:** `plan-endpoint` EADDRNOTAVAIL (passes 24/24 alone), `init-fixture-cleanup.red` ENOTEMPTY on a shared /tmp dir, `portable-skills.red` failed once then passed twice, cause not found.
- **Environment:** the scratchpad path is too long for tsx's IPC socket (EINVAL); a short `TMPDIR` is needed and likely explains much of the 80-failure `dbccc79` baseline.
- **Integration-test pollution:** outer-host teardown found EPIC-058 and EPIC-061 flipped to Completed and moved to `archive/`; restored in the host with the orchestrator's authorisation. The main checkout was never affected.
- **Ran-long:** Architect M1 plan 30 min (3x budget); DevOps BUG-133 merge 19.5 min and CR-120 merge 16 min (budget 5, full suite included).
- **Gate bypass:** `SKIP_SURFACE_GATE=1` on the chore(SPRINT-45) artifact commit (the gate judges the latest state.json item and blocks sprint-run reports, evidence and plans).
- **Autonomy Warnings:** none recorded in the sprint window (the log's entries are from May-June 2026).
- **Flashcard archival candidates:** none identified (see §5).

---

## §5 Lessons

### New Flashcards (Sprint Window)

29 cards dated 2026-11-14 in the live bundle (the canonical bundle shows none because its canonical run reads the seed FLASHCARD). Themes by tag: `#upgrade`/`#settings` 7, `#qa-red` 7, `#test-harness` 7, `#ledger`/`#transcripts`/`#workflow` 5, `#reporter` 3, `#worktree` 2, `#codex` 1, `#hooks` 1. One card was rejected (FLASHCARD-REJECT, duplicate of a `#worktree #test-harness` card).

| Date | Tags | Lesson |
|---|---|---|
| 2026-11-14 | #measurement #rework | "Dispatches minus one" overcounts rework ~4x: exclude pass N, Integrate, Pre-verify, interrupted and post-merge replays |
| 2026-11-14 | #ledger #transcripts | ~46% of subagent assistant lines repeat a message.id with identical usage; count usage once per id, tool_use per block id |
| 2026-11-14 | #ledger #transcripts | Workflow `.meta.json` has no toolUseId/finished; dedupe falls back to agent id; match interrupts only in user text blocks |
| 2026-11-14 | #ledger #workflow | Workflow agents' transcripts live at `<session>/subagents/workflows/<run>/`; `wf_*.json` agentCount under-reports resumed runs |
| 2026-11-14 | #ledger #transcripts | Resumed sessions copy subagent `.meta.json` without the `.jsonl`; count agents with a transcript, dedupe by toolUseId |
| 2026-11-14 | #upgrade #settings | Pair an upstream hook group only with an ours group holding a ClearGate hook; matcher-only pairing folds the user's own groups |
| 2026-11-14 | #upgrade #settings | Dedupe hooks on string commands only: prompt/agent hooks have no command |
| 2026-11-14 | #upgrade #settings | `mergeUpstreamSettings`: ours-only events stay first if no shared predecessor, last if no shared successor, else before the successor |
| 2026-11-14 | #upgrade #settings | Real installs put user-only events (Stop) first; a merge must anchor them, not append after ClearGate's events |
| 2026-11-14 | #qa #test-harness | `npm test` skips `*.integration.node.test.ts`; baseline-failures lists omit ~105 integration reds |
| 2026-11-14 | #qa #worktree | Baseline worktree for path-dependent integration tests must sit under the outer host, not /private/tmp (306 false fails) |
| 2026-11-14 | #worktree #test-harness | A throwaway cli worktree has no dist: ~80 dist-spawning tests fail; build dist there before comparing |
| 2026-11-14 | #gherkin #qa-red | A "no line says X" clause must not be a substring of the required label |
| 2026-11-14 | #qa-red #settings / #upgrade / #test-harness | Seven QA-Red cards: `cmds()` with `.find()` reads one group; spec-silent seam shapes go in the report; assert "N files planned" only in unit reds; delete a ClearGate hook group to reach upgrade's take path; avoid trailing `---` in changelog fixtures; zsh/BSD sed pitfalls |
| 2026-11-14 | #reporter #test-harness / #docs / #canonical | `prep_reporter_context.mjs` runs `main()` unguarded; its line-32 comment (missing ledger exits 1) is stale since BUG-081; a canonical run by path resolves REPO_ROOT to `scaffold/core` (seed FLASHCARD, no git log) |
| 2026-11-14 | #scripts #wrapper / #git | `run_script.sh` execs `"$@"` verbatim (pass `bash <abs path>/pre_gate_runner.sh`); `git -C <subdir>` reads the parent repo when the subdir has no `.git` |
| 2026-11-14 | #codex #skill / #hooks #snapshot / #templates | `/workflows` is a banned Codex-render token; hooks-snapshots pins `token-ledger.sh` byte-for-byte; `template-stubs.integration:211` compares live vs canonical `sprint_report.md` |
| 2026-11-14 | #gate #initiative #drafting | Initiative gate counts sections by position: nothing before `## 1.` |

### Flashcard Audit (Stale Candidates)

Not run this dispatch. The default bundle carries only the sprint-window slice, and source reads (FLASHCARD.md, repo greps) are outside the Reporter's bundle-only input; no `CLEARGATE_REPORTER_BROADFETCH` was set. Footnote for the Brief: stale-detection pass could not be filled, bundle slice missing for the full FLASHCARD.md. Human to run it at Gate 4 if wanted.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| (none identified from the sprint-window slice) | — | — |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | Specs carried Gherkin and surfaces; 15 spec-clarifications were needed, mostly from measurement edge cases only the holdout exposed |
| Sprint Plan Template usability | Yellow | §6 Execution Log newest-first held every event, but the log is very long and the Reporter must mine it for event counts |
| Sprint Report template (this one) | Yellow | v2 rows for measured rework and tokens work; the template has no home for walkthrough (post-merge) rounds, which R4 hides |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Yellow | One M1 deviation (union in `matchItem`) and one post-flight FAIL (BUG-134 PF-2/PF-3); M1 plan ran 30 min (3x budget) |
| Developer → QA artifact completeness | Green | Developer reports and targeted-test evidence were present for every item; one bare `git stash` against the shared-stash rule, restored cleanly |
| QA → Orchestrator kickback clarity | Green | QA-Red re-scopes (BUG-134, BUG-133 r2) were specific; one orchestrator-written scenario was self-contradictory and caused a Developer stop |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | 29 cards recorded in-window, one duplicate rejected with reason |
| Adjacent-implementation reuse rate | Green | Reused `count_tokens` child-process pattern, ledger digest, `mergeSettings` and pricing modules per the context table; no new runtime dependency |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Total QA bounces 0, Arch bounces 1 (BUG-134); measured rework 4 rounds across the sprint |
| Three-surface landing compliance | Yellow | Canonical edits only, live untouched by rule 9, so live-vs-canonical drift is expected and listed (parity 5a/5d, sprint-execution-mirror, template-stubs:211, doctor scaffold-drift). Live re-sync follows the dispenser_adapter verdict |
| Circuit-breaker fires (if any) | Green | None fired; one spec-gap stop (BUG-133 r2) resolved by CR:spec-clarification |

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospective, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `BUG-117` | 2 | 82 (+46/-36) | n | | |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

0 hotfixes in the sprint window (`hotfix-ledger.md` has no rows dated 2026-11). The prior four sprints' counts were not read from the bundle, so no rolling trend is claimed; `trend: INCREASING` is not flagged.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Yellow | Three incident files, all orchestrator invocation errors, none product defects (listed below) |
| Token ledger completeness | Red | 15 `unattributed` dispatches hold 95.7% of ledger tokens; per-agent breakdown refused (BUG-069). Measured transcripts attribute 94.4% (share 5.6%) |
| Token divergence finding | Yellow | Divergence flag YES: ledger work 1,876,798,197 vs session total 214,472,428 (delta 774%); the Reporter-pass estimate is TBD, which is expected, but the ledger figure double-counts and is not a usable cost. Use the measured 76,802,368 |

**Script Incidents** (`.cleargate/sprint-runs/SPRINT-45/.script-incidents/`):
- `20261114T085951Z-4567a33bc5f0.json` · orchestrator · `pre_gate_runner.sh arch .../BUG-134 sprint/S-45` exited 127 · bare script name not on PATH (`run_script.sh` execs `"$@"` verbatim); flashcard recorded.
- `20261114T112012Z-91f575d77fda.json` and `20261114T112023Z-91f575d77fda.json` · orchestrator · `bash .cleargate/scripts/pre_gate_runner.sh arch .../BUG-133-r2/cleargate-cli/ main` exited 1 (typecheck FAIL) · the nested cli path made `npm --prefix cleargate-cli` exit 254; the re-run on the outer host path was clean.

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-11-14 | Reporter agent | Initial generation |
