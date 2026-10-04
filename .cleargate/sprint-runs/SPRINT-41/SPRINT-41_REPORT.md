---
sprint_id: "SPRINT-41"
status: "Draft"
generated_at: "2026-10-04T07:00:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- role: reporter -->

# SPRINT-41 Report: Multi-Host Adapters and Frontmatter Locator

**Status:** Partial
**Window:** 2026-09-04 to 2026-10-04 (30 calendar days; plan `end_date` was 2026-10-09; two owner-ordered pauses, 2026-09-27 and 2026-09-30, then the 2026-10-04 close decision)
**Stories:** 41 planned / 26 shipped / 15 carried over (Parking Lot, BUG-102..116)

Source of record: `state.json` (26 Done, 15 Parking Lot, schema_version 3), `events.jsonl` (194 rows), `token-ledger.jsonl` (5,975 rows), RS-CLOSE evidence under `reports/RS-CLOSE-devops.md`. The sprint ran as 41 items, not the 16 originally approved on 2026-09-11; the set grew through nine append-only scope amendments (see §2 change log).

---

## §1 What Was Delivered

### User-Facing Capabilities
- **Freshly scaffolded work items no longer corrupt and now gate.** `locateFrontmatter` / `replaceFrontmatter` find the fence behind `<instructions>` instead of assuming offset 0 (BUG-067). Every remaining TS writer and two scripts follow (BUG-098; `.mjs` twin in BUG-090). RS-CLOSE Run 4 records `stamp=0 gate=0` on a freshly authored epic after one PostToolUse cycle (`clean-room-evidence.md` Run 4, check `claude.live.post-tool-use` PASS). `cleargate sprint init` also accepts `<instructions>`-led stories now (BUG-090; `sprint-init` PASS in both columns).
- **Claude PreToolUse gates actually block.** The shared hook-signal helper makes the two gates exit with a code Claude Code treats as blocking (BUG-089; before it, both gates failed open).
- **`cleargate init --host <claude|codex|portable|all>` and `cleargate host list|add|remove`.** The no-flag install is byte-compatible with the recorded Claude baseline; `--host all` resolves to `claude, codex` and carries no Codex-owned entries in `.claude/settings.json` (`clean-room-evidence.md` Run 4, `host-set`, `claude.no-foreign-hooks`). `--host copilot` is rejected as unknown by design (Copilot is deferred out of the sprint).
- **A Codex install that works.** `init --host codex` writes hooks, MCP config, `AGENTS.md`, agent TOMLs and portable skills; BUG-100 (sandbox writable git root), BUG-101 (dispatch attribution without a plaintext message id) and BUG-047 (gate-cache deadlock) were fixed after live Codex dogfood runs found them.
- **`cleargate verify-install`** with per-host verifiers (claude, codex) and a documented clean-room procedure (`.cleargate/knowledge/clean-room-verification.md`).
- **New-user CLI fixes:** `gate -v` on pass, `stamp --dry-run`, `wiki query`, `scaffold-lint` output defects (BUG-097); SPIDR scenario-coverage predicate and Gherkin pointer fixes for Story/CR/Bug (CR-123).

### Internal / Framework Improvements
- Tracked, self-contained scaffold source `cleargate-cli/scaffold/{core,hosts/claude,hosts/codex}` and a payload composer; `cleargate-planning/` is a frozen snapshot and no longer a build dependency (STORY-058-01/-02).
- `HostAdapter` contract, host registry, install-manifest host ownership with legacy-snapshot migration, `selectEntriesForHosts` as the one manifest query for doctor/upgrade/uninstall/prune (STORY-058-03/-04/-05/-06/-07).
- Durable meta-repo drift detection `checkCanonicalDrift` and the doctor `scaffold drift:` line (BUG-085).
- Clean-room harness: Claude baseline (STORY-058-09), Codex hooks harness (STORY-058-10), Codex loop harness with enforcement-parity evidence (STORY-058-13), `codex-hooks.mjs check --write-result` status/exit_code fix (BUG-099).
- Codex role/skill translation by codegen (`npm run gen:codex`, `--check`), repo-root shim for 8 Claude plus 5 Codex hooks (STORY-058-11).
- Host dispatch-mode split: wave-parallel (Claude) vs serial fallback with `dispatch_serial.mjs` and `lib/flashcard-gate.mjs` (STORY-058-12).
- Contract-first, build-then-integrate sprint planning/running: `storyBases`, `integrationReady`, `launchWave` bases, architect-reader/synth schema_version 2 (CR-124). This sprint was re-planned and executed under it from 2026-09-26.
- Test-fixture hygiene: BUG-096 removed a ~17k-directory / 19 GB temp leak in the init-parity fixture.

### Carried Over
Fifteen items sit in Parking Lot and are carried by the 2026-10-04 owner close decision (`sprint-context.md` Mid-Sprint Amendments, CLOSE DECISION). All are M7 Codex-dogfood fixes:
- **Partly built, preserved on branches:** BUG-102 (build complete; outer twin `5eac6ddc`, cli `story/BUG-102` `33d0627`), BUG-103 (independent QA FAIL, real R7 defect, qa=1 arch=1, state was Bouncing), BUG-105 (implementation uncommitted in cli worktree, build `a926ee8` on `story/BUG-105`, open hotfix slug-validation regression), BUG-114 (worktrees prepared, no role dispatched).
- **Not started:** BUG-104, BUG-106 through BUG-113, BUG-115, BUG-116.
- **Re-targeted:** the two close-blocking live-Codex deferred verifications (STORY-058-10 goal check 4, STORY-058-13 goal check 5) moved from `blocks: close` to `blocks: BUG-106`, because the owner's dedicated Codex login (option O2) never happened.
- Also outside the sprint: EPIC-058's Copilot adapter, token-ledger metering adapter (blocked on unverified Codex telemetry facts), plugin/marketplace distribution and `.codex/rules/**` command policy (explicitly deferred in sprint plan §1).

---

## §2 Story Results + CR Change Log

Bounce counts are from `state.json` and `events.jsonl` (6 `qa-bounce`, 25 `arch-bounce`, 2 `lane-demote` events). `events.jsonl` does not type bounces with the CR vocabulary, so the table assigns tokens by recorded cause where the plan or follow-ups state it and marks the rest "unclassified". Commit SHAs are the cli `main` merge commits where I could trace one in the git digest; outer SHAs are named where the log names them.

### Done: stories

| Item | Status | Cx | Commit (cli main unless noted) | qa | arch |
|---|---|---|---|---|---|
| STORY-058-01 scaffold layout | Completed | L3 | outer `9837329c`, cli `464e1e4b` | 0 | 0 |
| STORY-058-02 scaffold-source + manifest | Completed | L2 | not traced in bundle | 1 | 0 |
| STORY-058-03 HostAdapter + Claude adapter | Completed | L2 | not traced | 0 | 0 |
| STORY-058-04 `--host` selector | Completed | L2 | not traced | 0 | 1 |
| STORY-058-05 host lifecycle | Completed | L2 | not traced | 0 | 1 |
| STORY-058-06 manifest host ownership | Completed | L2 | not traced | 0 | 1 |
| STORY-058-07 per-host doctor/upgrade/uninstall | Completed | L3 | not traced | 0 | 2 |
| STORY-058-08 clean-room procedure + verify-install | Completed | L2 | not traced | 1 | 2 |
| STORY-058-09 Claude clean-room baseline | Completed | L2 | not traced | 0 | 1 |
| STORY-058-10 Codex payload surfaces | Completed | L3 | contract C1 `d0f0d95` | 1 | 2 |
| STORY-058-11 Codex roles/skills | Completed | L2 | `0399beb` | 0 | 2 |
| STORY-058-12 dispatch-mode split | Completed | L3 | `5f25a20` (outer `5733260b`) | 0 | 1 |
| STORY-058-13 Codex loop evidence | Completed | L3 | `0e5b0ac` (outer `a3b77505`) | 0 | 2 |

### Done: bugs and CRs

| Item | Status | Commit | qa | arch | Note |
|---|---|---|---|---|---|
| BUG-067 locator | Completed | not traced | 0 | 0 | lane fast to standard (LD) |
| BUG-085 live re-sync + drift check | Completed | not traced | 0 | 1 | lane fast to standard (LD) |
| BUG-089 PreToolUse exit code | Completed | not traced | 1 | 1 | |
| CR-123 SPIDR coverage | Completed | not traced | 1 | 1 | |
| BUG-090 sprint init / approved key | Completed | not traced | 0 | 1 | |
| BUG-096 temp-dir leak | Completed | not traced | 0 | 0 | |
| BUG-097 CLI output defects | Completed | not traced | 0 | 0 | |
| BUG-098 remaining positional readers | Completed | cli `e720592` (outer `3898c05e`) | 0 | 1 | |
| CR-124 contract-first DAG | Completed | cli `6fc13d2` | 0 | 1 | |
| BUG-099 codex-hooks `--write-result` | Completed | cli `f0c33f7` | 0 | 0 | only fast-lane item to ship |
| BUG-101 Codex dispatch attribution | Completed | cli `8c98177` | 0 | 1 | |
| BUG-100 Codex sandbox writable root | Completed | cli `79fc180` | 0 | 1 | |
| BUG-047 gate cache freshness | Completed | cli `c6d6656` (main tip) | 0 | 1 | |

### Parking Lot (carried)
BUG-102, BUG-103, BUG-104, BUG-105, BUG-106, BUG-107, BUG-108, BUG-109, BUG-110, BUG-111, BUG-112, BUG-113, BUG-114, BUG-115, BUG-116. Bounce counts: BUG-103 qa=1 arch=1, all others 0/0. See §1 Carried Over for per-item state.

### CR Change Log (sprint level)

| # | Event type | Description | Counter delta |
|---|---|---|---|
| 1 | CR:scope-change | 2026-09-11: BUG-085, STORY-058-12, STORY-058-13, BUG-089 registered (16 items) | n/a |
| 2 | CR:approach-change | 2026-09-11: bounded Codex bootstrap exception, tested in CG_TEST | n/a |
| 3 | CR:scope-change | 2026-09-24: CR-123 into the sprint | n/a |
| 4 | CR:approach-change | 2026-09-24: cli items on story branches in the main checkout, serial by hand (after SDR halt, `plans/sdr-halt-2026-09-24.md`) | n/a |
| 5 | CR:scope-change | 2026-09-26: BUG-090/-096/-097 from a fresh-folder smoke | n/a |
| 6 | CR:scope-change | 2026-09-26: BUG-098 (goal-critical, "stop corrupting") | n/a |
| 7 | CR:scope-change + CR:approach-change | 2026-09-26: CR-124, contract-first execution; R1 lifted, rules 19-21 | n/a |
| 8 | CR:scope-change | 2026-09-26: BUG-099 close blocker | n/a |
| 9 | CR:scope-change (unlabeled in source) | 2026-09-27: M7 batch BUG-047 (carried), BUG-100..105 from live Codex dogfood | n/a |
| 10 | CR:scope-change | 2026-09-27: BUG-107..116 (dogfood r5-r8) | n/a |
| 11 | CR:bug (qa-bounce, causes unclassified except BUG-103) | 6 QA bounces: STORY-058-02, -08, -10, BUG-089, CR-123, BUG-103 (R7 porcelain " -> " parsing hole) | qa_bounces +6 |
| 12 | Plan-origin arch-bounce | 25 arch-bounces across 20 items; -13 hit arch=2 (TPV reject + post-flight B1, M6 copied SKILL.md:536 list and missed :448) | arch_bounces +25 |
| 13 | LD | BUG-067 and BUG-085 demoted fast to standard at plan confirmation (decision D2) | 2 LD events |

**UR Events:** none recorded. Direction came from the owner as plan amendments (CR rows above), not as review feedback on delivered work.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 41 (13 stories, 26 bugs, 2 CRs; final roster) |
| Stories shipped (Done) | 26 (13 stories, 11 bugs, 2 CRs) |
| Stories escalated | 0 |
| Stories carried over | 15 |
| Fast-Track Ratio | 3.8% (1 of 26 shipped at close: BUG-099; 1 of 41 planned-and-carried would read 2.4%) |
| Fast-Track Demotion Rate | 66.7% (2 LD events of 3 items ever fast: BUG-067, BUG-085, BUG-099) |
| Hotfix Count (sprint window) | 0 (`wiki/topics/hotfix-ledger.md` holds one row, `merged_at` 2026-04-30) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 2 |
| Total QA bounces | 6 |
| Total Arch bounces | 25 |
| CR:bug events | 6 (QA bounces taken as CR:bug; causes unclassified in events.jsonl) |
| CR:spec-clarification events | not tallied (not recorded as typed events) |
| CR:scope-change events | 8 (7 labeled plus the unlabeled M7 batch registration) |
| CR:approach-change events | 4 (3 labeled amendment rows, plus the CR-124 row that also carries scope-change) |
| UR:bug events | 0 recorded |
| UR:review-feedback events | 0 recorded |
| Circuit-breaker fires: test-pattern | 0 recorded |
| Circuit-breaker fires: spec-gap | 0 recorded |
| Circuit-breaker fires: environment | 0 recorded |
| **Bug-Fix Tax** | 14.6% (6 / 41); 23.1% over the 26 shipped |
| **Enhancement Tax** | 0% (0 UR:review-feedback) |
| **First-pass success rate** | 23.1% over shipped (6 of 26 Done with qa=0 and arch=0: BUG-067, STORY-058-01, -03, BUG-096, -097, -099); 48.8% (20 / 41) if the 14 untouched carried items are counted, which overstates it |
| Token source: ledger-primary (sprint work, non-reporter, summed deltas) | 144,761,648,718 tokens, UNTRUSTED (see below) |
| Token source: session-totals (sprint total) | 1,590,158,734 tokens (digest at 06:41Z; file now reads 1,603,044,352 including the in-flight orchestrator/Reporter session) |
| Token source: Reporter analysis pass | TBD, see token-ledger.jsonl post-dispatch |
| Token source: story-doc-secondary | N/A (3 report files mention `token_usage`/`draft_tokens`; none carry usable totals) |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs session-totals) | about 9,000% (144.76B vs 1.59B, ratio about 91x) |
| Token divergence flag (>20%) | YES |

Note on counts: "41 planned" is the final roster in `state.json` (13 STORY-058-NN, 26 BUG, 2 CR). The original approved set was 16 items; the growth is a finding in §4.

### Token cost (two-line split plus Reporter pass)
```
Token cost (sprint work, dev+qa+architect): 144,761,648,718  (ledger delta sum, UNTRUSTED, see divergence)
Token cost (Reporter analysis pass):        TBD — see token-ledger.jsonl post-dispatch
Token cost (sprint total):                  1,590,158,734    (.session-totals.json, 6 sessions, Claude telemetry only)
```
Rough USD cost: not published. No rate table or trusted per-agent split exists for this sprint, and I will not fabricate one.

### Attribution refusal (BUG-069 check)
Census of `agent_type` across 5,975 ledger rows: architect 569, qa 119, developer 75, devops 30, general-purpose 4, cleargate-wiki-query 9, **unattributed 5,169 (86.5%)**. The per-agent and per-story cost tables are therefore **refused**. 5,169 rows carry `agent_type: "unattributed"` and the story-id census puts 144.33B of 144.76B tokens in the `unassigned` bucket; no dispatch marker was written for those dispatches (consistent with `BUG-101`/`write_dispatch.sh` findings that Codex-side session ids never match markers). The census is the finding. Ledger rows were not repaired or rewritten.

### Token divergence finding
- The ledger delta sum (output 571,136,717; cache_read 142,857,800,954 across 5,975 rows, about 100 real agent dispatches) over-counts by about 91x against session totals. The orchestrator's dashboard check (`close-followups.md`, 2026-09-27) reached the same conclusion: cumulative transcript re-counted per SubagentStop or per turn.
- Codex-run token telemetry is unavailable by design (cross-cutting rule 6; every Codex evidence run reports `metering: unavailable`). Neither number covers Codex-side work. No synthetic zero rows were written.
- The implausible-cost anomalies in the digest (for example BUG-103 at 425.7x and CR-124 at 585.2x of median story cost) are artefacts of the same over-count and carry no cost signal.
- Format: all rows are CR-018 v2 delta rows; no pre-0.9.0 caveat applies.

---

## §4 Observe Phase Findings

The sprint produced 22 bugs found by observation during execution (not planned at 2026-09-04): BUG-090, -096, -097 (fresh-folder smoke), BUG-098 (BUG-090 post-flight), BUG-099 (close blocker), BUG-100..116 (live Codex dogfood r0-r8, issue log in `/Users/ssuladze/Documents/Dev/CG_TEST/codex-dogfood-20260927T071948Z-runs/issues.md`, plus BUG-047 carried). Seven of the 22 shipped (BUG-090, -096, -097, -098, -099, -100, -101) plus the carried-in BUG-047; the other 15 are carried. Review feedback: none recorded.

### 4.1 Bugs Found (UR:bug)
| Date | Description | Resolution | Commit |
|---|---|---|---|
| 2026-09-26 | `sprint init` rejects fresh stories; init-parity temp-dir leak; new-user CLI output defects | BUG-090/-096/-097 Done | via DevOps merges, SHAs not traced |
| 2026-09-26 | Remaining positional frontmatter readers; `--allow-drift` phantom block | BUG-098 Done | cli `e720592` |
| 2026-09-26 | `--write-result` omits status/exit_code (would fail close Step 2.9) | BUG-099 Done | cli `f0c33f7` |
| 2026-09-27 | Codex sandbox read-only `.git`; dispatch attribution; gate-cache deadlock | BUG-100/-101/-047 Done | cli `79fc180`, `8c98177`, `c6d6656` |
| 2026-09-27 | I17-I27 skill/role/script drift for a literal non-Claude orchestrator | BUG-102..116 registered | carried, no fix |
| 2026-09-30 | BUG-103 QA: tracked source file `src/example -> .cleargate/wiki/fake.md` treated as wiki rename churn | open (R7), QA-Red re-seal needed | none |
| 2026-09-30 | BUG-105 hotfix "Slug validation" anchor fails (actual exit 0, expected 1) | open | none |

### 4.2 Hotfixes Triggered
| ID | Trigger | Resolution | Commit |
|---|---|---|---|
| (none) | hotfix ledger has no row in window | none | none |

### 4.3 Review Feedback (UR:review-feedback)
| Date | Description | Status (folded / deferred) | Deferred to / Rationale |
|---|---|---|---|
| (none) | no UR events recorded | n/a | n/a |

### 4.4 Process and tooling signals (observed)
- **QA-Red seals are mutant-weak.** Every M7 TPV (BUG-100, -101, -103, -047) rejected QA-Red's seal and re-sealed test-only (kill rates at first seal: BUG-100 18/31, BUG-103 11/33, BUG-101 22/37). Earlier TPVs rejected STORY-058-11, -12 and -13 as well. TPV's live mutant pass is what caught them, at about one hour each.
- **Plan-origin arch-bounces dominate.** 25 arch-bounces against 6 QA bounces; STORY-058-13 reached arch=2 on a plan that copied one SKILL.md list and missed another. One more would have escalated.
- **Shared scratchpad collision (M7, about 10:04-10:07Z per `close-followups.md`).** The BUG-047 TPV executed the BUG-100 Developer's `mutants.py` from the shared session scratchpad, which applied and reset mutants in `.worktrees/BUG-100`; the Developer was notified to re-verify. Agents also deleted scratchpad files by glob twice (cards recorded).
- **Hand-typed timestamps ran 1-2 h ahead of the clock** (corrected in `a7b9f354`); card recorded: take every time from `date -u`.
- **Flashcard gate parser over-parses.** `flashcard-gate.mjs` `flaggedCards` in md mode counts bullet lines after a report's `flashcards_flagged:` list as cards (BUG-100-dev.md produced 29 "cards", 26 of them brief bullets).
- **Close-script ordering gaps.** `close_sprint.mjs` Step 2.5 requires this report before Step 3.5 builds the Reporter bundle; Step 2.8 requires the main merge before close while skill §E.5 says merge after sign-off. This Reporter ran against a bundle built before the report existed.
- **Surface gate picks the active item by max `updated_at` of main `state.json`; a no-op same-state `update_state` left the wrong STORY resolved** and blocked a BUG-098 twin commit (flashcard recorded; candidate fix: resolve by branch name `story/<ID>` first).
- **Dashboard.** Carried Parking Lot items render as red "Blocked 15", a carry-over is not a blocker; static `dashboard.html` polls `/data` every 2 s (404 console errors) and its header renders blank. Token panel is untrustworthy (see §3).
- **Autonomy warnings (`.cleargate/hook-log/autonomy-warnings.log`, in window):** five `AskUserQuestion` calls recorded: 2026-09-06T16:08:47Z (unknown), 2026-09-24T22:11:14Z (unknown), 2026-09-26T12:59:03Z (unknown), 2026-10-03T23:11:39Z (qa), 2026-10-04T06:22:21Z (developer). The last two fall after the 2026-09-30 pause and were not reviewed against the true-blocker list here.
- **Script incidents** (`.script-incidents/`, 26 JSON files, all exit 1 except one exit 97). Notable: `2026-09-11T23:24:52Z` orchestrator `cleargate sprint preflight: 1/5 checks failed`; `2026-09-24T23:33:56Z` `update_state.mjs` node error; `2026-09-26T15:17-17:43Z` four developer-era `cat` failures on `.worktrees/CR-124/.clearg…`; `2026-09-30T15:06-15:08Z` three qa `node` module-resolution/run_main errors; `2026-09-30T16:06:14Z` node "Multiple state.json files found; specify --state-file"; `2026-09-30T16:23:25Z` bash exit 97 (BUG-105 verification terminated at pause). Remaining files: 12 npm/bash/env incidents on 2026-09-24/25 with empty stderr, and python3/bash/node incidents on 2026-09-30. Incident JSON dir: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/.script-incidents/`.

### Risks Materialized
- Live Codex verification could not be obtained on the pinned binary (owner login never provided) so goal checks 4 and 5 remain scripted-only; see the Goal Acceptance Check evidence note in the Brief.
- A QA-Verify smoke ran `init --yes --pin 0.0.0-qa` before its `cd` and wrote into the meta-repo (2026-09-26T01:20Z); the orchestrator restored everything to HEAD. Rule since: any writing CLI smoke runs as one `(cd <literal path> && …)`.
- A bare `cleargate` on PATH (global 0.26.1) once cached `predicate error` into a story (2026-09-25, repaired); rule 18 added.
- BUG-103's R7 defect is a real mis-exemption: a source file whose name contains " -> " is treated as wiki churn and readiness exits 0.

---

## §5 Lessons

### New Flashcards (Sprint Window)
`FLASHCARD.md` holds 486 cards dated within 2026-09-08 to 2026-10-04 (by date: 09-11 x2, 09-12 x6, 09-24 x1, 09-25 x113, 09-26 x271, 09-27 x91, 09-30 x2). Top tags by occurrence: #test-harness 184, #codex 75, #tpv 66, #hooks 37, #clean-room 37, #frontmatter 31, #qa-red 30, #host 25, #qa 21, #gate 21, #worktree 20, #init 19. Notable 2026-09-27/30 cards:

| Date | Tags | Lesson |
|---|---|---|
| 2026-09-30 | #tools #test-harness | Yielded exec output is not completion; retain session_id and poll to final exit. |
| 2026-09-30 | #test-harness #baseline | Frozen /tmp acceptance fixtures can vanish across a pause; keep a checksum-backed archive. |
| 2026-09-27 | #tpv #danger | The session scratchpad is shared by parallel agents; a peer overwrote mutants.py. Namespace by item id. |
| 2026-09-27 | #tpv #test-harness | One-source-per-case reds leave source ORDER unpinned; add a case where every source names a different id. |
| 2026-09-27 | #orchestrator #timestamps | Take ISO times from `date -u`; never type them. |
| 2026-09-27 | #codex #dispatch | Live spawn_agent message is ciphertext; hooks see only task_name/agent_type in plaintext. |
| 2026-09-27 | #gate #cache | Once BUG-047 merges, gate check rewrites a stale cache; stop hand-bumping last_gate_check. |
| 2026-09-27 | #close #test-harness | Once close_sprint consults PATH, ambient-env spawns find the global cleargate; pin PATH. |
| 2026-09-27 | #qa-red #tpv #test-harness | A TPV's own reported reseal sha256 can be wrong; recompute after apply. |

### Flashcard Audit (Stale Candidates)
A full symbol-grep pass over every unmarked card was **not run**: the bundle carries no audit slice, and the Reporter contract forbids source/FLASHCARD reads outside the bundle. Orchestrator-identified candidates from `close-followups.md` are listed instead (human approves at Gate 4):

| Card (date · lead-tag · lesson head) | Missing symbols | Proposed marker |
|---|---|---|
| 2026-09-25 · #gate #preflight #stale · `writeCachedGate` skips the write when pass+criteria unchanged ... hand-bump | superseded by BUG-047 (cli `c6d6656`) | [R] superseded-by BUG-047 |
| FLASHCARD lines 124/125/126/140 (offset-0 frontmatter cards: 2.6c no-op skip, `^---` closer, `assert_story_files.mjs:162`, doctor `<instructions>` skip) | resolved by BUG-090 and BUG-098 | [S] after the correction card below is recorded |

Pending correction cards the orchestrator named but I did not write: `2026-09-26 · #frontmatter #correction · BUG-098 merged: sprint.ts writers, 2.6d, parent-approved, slug, intake, doctor, 2 scripts read past <instructions>` and one BUG-090 D9 card superseding the 4 stale cards.

### Supersede Candidates
| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-09-27 #gate #cache (BUG-047 merged) | 2026-09-25 #gate #preflight #stale (hand-bump last_gate_check) | [R] |
| BUG-098 correction card (to be recorded) | 4 offset-0 cards (lines 124/125/126/140) | [S] |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Yellow | Epic/story templates lacked an `approved:` key (BUG-090); Task Breakdown rows cannot be ticked from a detached outer host (flashcard 2026-09-27). |
| Sprint Plan Template usability | Yellow | Grew from 16 to 41 items by amendment; plan §1 prose carries nine dated amendments, hard to read; contract-first schema (waves.json v2) arrived mid-sprint via CR-124. |
| Sprint Report template (this one) | Yellow | No place for goal-condition evidence or carried-item state; token table assumes Claude-only telemetry. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Yellow | 25 arch-bounces, many plan-origin (M6 missed SKILL.md:448); plan cited `.ts` line ranges that tempt QA-Red into opening code. |
| Developer → QA artifact completeness | Yellow | Developer handoffs frequently not in the `format: structured` JSON (BUG-102 note); BUG-105 handed over uncommitted. |
| QA → Orchestrator kickback clarity | Green | BUG-103 QA FAIL named a reproducible R7 case with exact porcelain line. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | Gate over-parses bullet lists under `flashcards_flagged`; 486 cards in one window is also a curation load. |
| Adjacent-implementation reuse rate | Green | Context table shows exports consumed across items (locator, `SANCTIONED_BASELINE_DELTAS`, `composePayload`); no duplication kick-backs recorded in the bundle. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Yellow | Cap respected; -07, -08, -10, -11, -13 sat at arch=2, one short of escalation. |
| Three-surface landing compliance | Yellow | Canonical/live twins and clean-room runs held; two earlier post-merge regressions (BUG-089 pin-placeholder, CR-123 Brief anchor) are why rule 16 exists. Twin re-derivation was a recurring cost. |
| Circuit-breaker fires (if any) | Green | None recorded. |

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `BUG-067` | not computed | not computed | y | | |
| `BUG-085` | not computed | not computed | y | | |
| `BUG-099` | not computed | not computed | n | | cli `abd9afb`, merge `f0c33f7`; QA diff scope "exact", 176/176 solo tests |

Files/LOC are not computed: the git digest in the bundle was unavailable ("Git log unavailable for sprint/S-41") and I did not fall back to raw git.

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend
0 hotfixes in the SPRINT-41 window. `wiki/topics/hotfix-ledger.md` holds a single row (`merged_at` 2026-04-30), so the rolling count for the last four sprints is 0, 0, 0, 0 (ledger-derived; no per-sprint reports consulted). Monotonic-increase flag: no.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Yellow | 26 incident files captured, many with empty stderr or unattributed agent; BUG-109 records QA-Red's intended red runs as unattributed incidents. |
| Token ledger completeness | Red | 86.5% of rows `unattributed`; per-agent table refused; Codex telemetry unavailable by design. |
| Token divergence finding | Red | Divergence >20%: ledger=144,761,648,718 session-totals=1,590,158,734 delta about 9,000% (ratio about 91x). Over-count in delta accounting; Reporter pass TBD. |

### Follow-ups routed (from `close-followups.md`, to file under EPIC-058 or the next sprint)
- **Candidate CRs:** QA-Red brief requires one negative case per pinned plan rule plus an all-sources-disagree ordering case, or a cheap self-mutant pass before WRITTEN; dispatch briefs name a per-agent scratch dir (`/private/tmp/cg-<sprint>-<role><id>-<utc>/`) and forbid running another agent's scripts; surface gate resolves the active item by branch name first.
- **Candidate bugs:** flashcard-gate md-mode over-parse; close_sprint Step 2.5 / 3.5 / 2.8 ordering; `cleargate host add` bypasses `payloadFilter` (`lifecycle.ts:293-294`); `gate-v2.integration` 3/5 pre-existing argv-ordering failures (`gate.ts:422/:457`); `launch_wave` ref allowlist admits `-x` and `..`; `integrationReady` is immediately ready for fail-safe trailing-wave stories with no upstream edges; 2.6c phantom-led parent no-op write still archives and logs Completed, and one malformed parent aborts all remaining flips with a "No frontmatter" message; sprint archive moves a malformed item unstamped; `status-vocab-phase-b.red` runs a real `npm run prebuild` mid-suite; `cleargate upgrade` never calls the codex adapter install.
- **PF12 / PF13 / TPV-A6 follow-ups:** PF12-FU-1..6 (record accepts any wave member; sprint validation; exit-1 collision with INVALID; stale header; stale `templates/` reads; UTF-8 vs raw bytes) and PF13-FU-1..9 (vacuous roles/skills pass on empty listing, role-thread restriction, ancestry-based merge check, header-anchored run parse, controls evidence column, defined-role requirement, run-hint form, multi-turn children).
- **Doc/stale text:** enforcement line 103 "file-disjointness", `collision_surface.sh:40` "five-clause", `launch_wave` usage line, `M6.md:954` offset-0 regex text, M5-A54 `+90` (actual `+96`), flashcard SKILL.md description containing `' #'` truncates Codex YAML listing; Codex R2 should say "from the repository root".
- **Dashboard:** add a Parked/Carried status bucket; stop polling in static mode.

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-10-04 | Reporter agent | Initial generation |
