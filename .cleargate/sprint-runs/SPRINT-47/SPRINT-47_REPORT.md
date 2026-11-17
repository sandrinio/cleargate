---
sprint_id: "SPRINT-47"
status: "Draft"
generated_at: "2026-11-16T18:30:00Z"
generated_by: "Reporter agent"
template_version: 2
goal_verdict: "met"
goal_verdict_basis: "(a), (b) and (c) met; (a) integration met on the post-re-sync re-run at Gate 4 (57 fail, all in the 99cbfd7 baseline, none new)"
---

<!-- role: reporter -->

# SPRINT-47 Report: Proof Decides Done

**Status:** Completed (goal verdict `met` after the Gate 4 re-run; released as 0.32.0 at Gate 4, see §4 "Release and Gate 4 state")
**Window:** 2026-11-16 to 2026-11-16 (1 calendar day; first story commit 37efc13, final cli main b4702a5)
**Stories:** 6 planned / 6 shipped / 0 carried over

**Sprint Goal:** Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".

**Goal Acceptance Check status** (recorded at Gate 2, tier live; the verdict below follows it literally):

| Check | Condition | Status at report time | Evidence |
|---|---|---|---|
| (a) unit | cli `npm test` has 0 failures at final cli `main` | Met: 5741 tests, 5739 pass, 0 fail, 2 skipped (cli b4702a5) | `evidence/final-b4702a5-unit.log` |
| (a) integration | `npm run test:integration` fails only on tests in the kickoff list | Met at Gate 4: after the live re-sync, 959 run, 57 fail vs 64 at baseline 99cbfd7; 133 failing names, every one in the baseline list, none new, 12 gone (cli a77d36f built as 0.32.0). At report time it was 87 fail: the extra names were live-vs-canonical parity checks that break by design until the re-sync (rules 19, 11). | `evidence/baseline-failures-99cbfd7.txt`, `evidence/gate4-failures-a77d36f.txt`, `evidence/gate4-a77d36f-integration.log`; before the re-sync: `evidence/final-failures-b4702a5.txt` |
| (b) clean-room | Packed RC 0.32.0-rc.1 (from b4702a5) installed into a temp Go repo with an `e2e:` target | Met: proof block seeded `{unit: "go test ./...", container: "make e2e"}`; `cleargate new story` shows `proof_tier`, `## Proof` and holdout guidance; `gate check` names `proof-declared` | `evidence/sandbox/0.32.0-rc.1/` |
| (c) sandbox end to end | Four-item run on the RC with Postgres 18 | Met: all six criteria held | `.cleargate/field-trials/2026-11-sandbox-s47.md` |

Verdict: **met** (updated by the orchestrator at Gate 4, 2026-11-17, after the post-re-sync integration re-run cleared; the Reporter's verdict at report time was `partial`).

**GOAL_RELATION per milestone:** the sprint plan's Sprint Design Review block (§2.1) is not part of the reporter bundle, so the per-milestone `GOAL_RELATION` lines could not be quoted verbatim. The bundle slice for plan §2 is empty. See Brief footnote.

---

## §1 What Was Delivered

### Proof (rule 7, hand-recorded because the live loop is still 0.31.2)

This is the 0.32.0 report shape this sprint ships. Tier comes from the sprint plan's Proof column.

| Item | Tier | Evidence | Result |
|---|---|---|---|
| STORY-065-01 Items declare a proof tier | unit + integration | `.cleargate/sprint-runs/SPRINT-47/evidence/STORY-065-01-proof.md` | proven |
| STORY-065-02 Record evidence for a proof | unit + integration + clean-room (container-class) | `.cleargate/sprint-runs/SPRINT-47/evidence/STORY-065-02-proof.md` | proven |
| STORY-065-03 Done waits for evidence | unit + integration | `.cleargate/sprint-runs/SPRINT-47/evidence/STORY-065-03-proof.md` | proven |
| STORY-065-04 Prove stage in the build loop | unit + docs pins | `.cleargate/sprint-runs/SPRINT-47/evidence/STORY-065-04-proof.md` | proven |
| STORY-065-05 Holdout scenarios and property tests | unit + integration | `.cleargate/sprint-runs/SPRINT-47/evidence/STORY-065-05-proof.md` | proven |
| STORY-065-06 Close and report show proof | unit + integration | `.cleargate/sprint-runs/SPRINT-47/evidence/STORY-065-06-proof.md` | proven |

Note: these six files are hand-written orchestrator records of QA-Verify results, not `record_evidence.mjs` output (the recorder is this sprint's own deliverable and not live until Gate 4). "proven" means the tier named in the plan's Proof column was reached, as recorded there.

### User-Facing Capabilities
- A work item (story, CR, bug) now declares how it is proven: a `proof_tier` frontmatter key (`unit | container | live | human`) and a `## Proof` section in the templates, checked by a new `proof-declared` readiness predicate (STORY-065-01; `cleargate gate check` names it on an unedited story, shown in the clean-room run).
- `cleargate init`/`upgrade` seeds `proof.unit` and `proof.container` into `gate-checks.json` (container from a Makefile `e2e:` target) and keeps user-added gate keys across upgrade (STORY-065-02; clean-room shows `{"unit":"go test ./...","container":"make e2e","browser":""}`).
- Items can carry `@holdout` Gherkin scenarios that QA-Red and the Developer never see; QA-Verify writes and runs the test, landing it in a `qa-red(<ID>): amendment` commit (STORY-065-05; shown end to end in the sandbox run, field-trial criterion 3).
- Close and the report show proof per item: "proven at <tier>" or "built, not proven at tier X", with the ack prompt naming unproven items (STORY-065-06).

### Internal / Framework Improvements
- `record_evidence.mjs` and `lib/proof.mjs` (contract C1): the only writer of `evidence/<ID>.json`; runs the item's proof command with a timeout, process-group kill, secret and URL-credential masking, baseline excuse and atomic write; exit codes 0/1/2 (STORY-065-02, C1 37efc13).
- Done guard: `merge_story.mjs` and `update_state.mjs` set an item `Done` only when its evidence passes at its declared tier, else `Sprint Review` with `awaiting proof: <tier> (<reason>)`; an untiered item still reaches Done (Gate 2 decision 5) (STORY-065-03).
- `prove` stage before `merge` in every lane's stage list; new skill section C.6.5 with the exit table; walkthrough proof in Phase D; serial path and Codex rendering updated (STORY-065-04).
- `seal_red.mjs --amendment` and the holdout view/withhold path for `qa_red_lint.mjs` (STORY-065-05).
- Sprint-context Goal Acceptance Check gains a `Tier:` line; preflight check 5 requires a `proof_tier` on every in-scope story, CR and bug whatever its age.
- Consolidation (D.5): one reuse change, commit c782d3d on cli branch `consolidate/S-47` (`src/init/detect-test-stack.ts` `projectGateChecks` now calls the sprint's own `parseObject`); no red file touched.

### Carried Over
- None. No story was carried over. Two Gate 4 actions remain by design (see §4): live re-sync, release 0.32.0.

---

## §2 Story Results + CR Change Log

Code history is in the nested cli repo: `git -C cleargate-cli log --oneline 99cbfd7..b4702a5`. The outer branch `sprint/S-47` holds bookkeeping only. State.json counters for each story are `state=Done`.

### STORY-065-01: Items declare a proof tier (absorbs CR-128)
- **Status:** Completed
- **Complexity:** runtime lane (assign-lane-script)
- **Commit:** cli `475b7c6` (dev), merged `d669c7d`; qa-red `834fac6`
- **Bounce count:** qa=0 arch=1 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | Post-flight FAIL: `readProofSection` split on `\n` (CRLF item never matched a label) and label continuations ran past a heading. Amendment reds 9e5b7c5, fix `afc88a7` | arch_bounces +1 |
  | 2 | CR:spec-clarification | Gate 2: Tier line at the end of the Goal Acceptance Check section; cut-over is a UTC timestamp (2026-11-16T09:50:00Z) later than every pending `created_at`; SKILL A.1 item 5 text also updated | none |
- **UR Events:** none.
- Known reds from its merge: `template-stubs.integration` and `gate-section-index-pinning.live.integration` S1c (live vs canonical, rule 19 class). R6 sweep: 132 story/CR/bug items, 0 changed.

### STORY-065-02: Record evidence for a proof
- **Status:** Completed
- **Complexity:** runtime lane (owner of C1)
- **Commit:** cli `0669ac3` (dev), merged `3dfd3eb`; qa-red `b644eff`, `7b594db`
- **Bounce count:** qa=0 arch=1 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | Post-flight FAIL: prototype-unsafe gate-key merge (`in` instead of own-key; `__proto__` pollution); recorder waited out the timeout with a background child and left orphans. Amendment reds f1be6a6, fix `84d7f77` | arch_bounces +1 |
  | 2 | CR:spec-clarification | With `--worktree`, a `live`/`human` item records `pending` and runs nothing; only `--human` records a human proof (raised by the 065-04 plan) | none |
  | 3 | CR:spec-clarification | Mask `scheme://user:password@` credentials in the tail (also applied to the `command` field, accepted deviation) | none |
  | 4 | CR:spec-clarification | C1 amendment (orchestrator, contract_change_rule, goal-critical): `readProofTier` skips a leading `<instructions>` block. Amendment red `213ad3c`, fix `b159b5c`. Not a bounce | none |
- **UR Events:** none.
- Clean-room (Developer): `npm pack` installed under a temp prefix, `cleargate init --yes` in a temp Go repo; `doctor` printed no gate-checks or drift line.

### STORY-065-03: Done waits for evidence
- **Status:** Completed
- **Complexity:** standard lane
- **Commit:** cli `b94ef3f` (dev), merged `0100761`; qa-red `9915f3c`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none beyond a plan deviation accepted: `test/helpers/scaffold-roots.ts` `canonicalPath` maps `.codex/` to `scaffold/hosts/codex`.
- **UR Events:** none.

### STORY-065-04: Prove stage in the build loop
- **Status:** Completed
- **Complexity:** runtime lane (raised by the Architect, Gate 2 decision 8)
- **Commit:** cli `c1eee86` (dev), `140faa7` (post-flight fix), merged `70aa235`; qa-red `ec39600`, re-seal `b7746b8`
- **Bounce count:** qa=1 arch=1 total=2
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | Developer blocked Red-Test: three wrong sealed pins. QA-Red re-seal `b7746b8` | qa_bounces +1 |
  | 2 | CR:spec-clarification | R2a: `wave_runner_args.mjs:144` counts `Sprint Review` as merged (found by 03's Done-reader survey); test added in the re-seal | none |
  | 3 | CR:bug | Post-flight FAIL (skill wording): untiered items halted at the barrier; exit-1 rework skipped post-flight on the serial path. Amendment `248a241`, fix `140faa7` | arch_bounces +1 |
  | 4 | CR:spec-clarification | R3a: an untiered item passes the prove barrier; the exit-1 rework route includes the post-flight review | none |
- **UR Events:** none.

### STORY-065-05: Holdout scenarios and property tests
- **Status:** Completed
- **Complexity:** standard lane
- **Commit:** cli `08dfd17` (dev), merged `61317b3`; qa-red `f744333`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none. One contract note recorded from the 01 post-flight: `scanGherkinScenarios` accepts more tag/fence shapes than pinned interface P2; alignment goes to intake.
- **UR Events:** none.

### STORY-065-06: Close and report show proof (absorbs CR-129)
- **Status:** Completed
- **Complexity:** standard lane
- **Commit:** cli `f8afa56` (dev), integration `927c793`, merged `b4702a5`; qa-red `d714e3f`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none. Spec clarification applied at Gate 2: untiered items are not "unproven"; CR-082 failure output kept.
- **UR Events:** none.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 6 |
| Stories shipped (Done) | 6 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (0 of 6; lanes standard 3, runtime 3) |
| Dispatches by lane | fast not measured (no fast items) / standard 9 (3 items, 3 per item) / runtime 31 (3 items, 10.33 per item) |
| Rework by defect location | code 0 / red-test 1 / spec 0 / unknown 0 (bundle line, as measured) |
| Fast-Track Demotion Rate | N/A (no fast-lane items) |
| Hotfix Count (sprint window) | not measured (hotfix ledger not in the bundle) |
| Hotfix-to-Story Ratio | not measured |
| Hotfix Cap Breaches | not measured |
| LD events | 0 (no fast-lane items; `lane_demoted_at` null on all six) |
| Total QA bounces | 1 (state.json) |
| Total Arch bounces | 3 (state.json) |
| Rework rounds (measured) | 13 (sprint_metrics.mjs) |
| Git rework commits (measured) | 10 |
| Rework rounds (hand recount, rule 10) | 5 |
| CR:bug events | 4 |
| CR:spec-clarification events | 5 (mid-sprint; plus 4 Gate 2 clarifications applied at planning) |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 66.7% (4 CR:bug / 6 stories; these are the four bounce events, each a defect found by Architect post-flight or the red-test re-seal) |
| **Enhancement Tax** | 0% |
| **First-pass success rate** | 50% (3 of 6 items with measured rework total 0: 03, 05, 06) |
| First-pass success rate (state.json counters) | 50% (3 of 6: 03, 05, 06; same set) |
| Test gate | Passed — "npm --prefix cleargate-cli test" ran at kickoff (exit 0). |
| Subagent tokens (measured) | 76,597,502 tokens (43 dispatches, transcripts, no overlap) |
| Unattributed share (measured) | 1.5% (1 dispatch, 1,135,955 tokens, sprint-level) |
| Orchestrator window tokens (ledger) | 4,420,558,279 tokens (upper bound: rows are overlapping orchestrator windows) |
| Token source: ledger-primary | 4,420,558,279 tokens (sum of rows; over-counts, see below) |
| Token source: story-doc-secondary | N/A |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs task-notif) | N/A (no tertiary source) |
| Token divergence flag (>20%) | YES (ledger-row sum vs measured transcript total; see below) |

**Lane paths.** Standard lane (03, 05, 06): QA-Red, Developer, QA-Verify (then prove and merge). Runtime lane (01, 02, 04): story plan, QA-Red, Developer, QA-Verify, post-flight (then prove and merge). Fast lane: Developer then merge (no item). Stage lists are from the bundle's story plans and `segment_stages.mjs`; `prove` is new this sprint and live loop 0.31.2 ran the sprint by hand per rule 13.

**Why the rework counts differ.**
- `sprint_metrics.mjs` counts per dispatch: 13 rework rounds (01: 3, 02: 6, 04: 4) because every re-dispatch of QA-Red, Developer or QA-Verify after a first pass counts as a round. It also counts git rework commits: 10.
- The hand recount from git counts rounds of changes, not dispatches: 01: 1 (post-flight fix `afc88a7`), 02: 2 (post-flight fix `84d7f77`; C1 amendment `b159b5c`), 04: 2 (red-test bounce re-seal `b7746b8`; post-flight R3a `140faa7`), 03/05/06: 0. Total 5.
- `state.json` counters: arch_bounces 1 each on 01, 02 and 04, qa_bounces 1 on 04: total 4. The C1 amendment on 02 is a contract change by the orchestrator, not a bounce, so it adds a round to the recount but not a counter. The bundle lists the disagreement per item: 01 derived 3 / git 2 / counter 1; 02 derived 6 / git 5 / counter 1; 04 derived 4 / git 3 / counter 2.
- Reading: all three sources agree that 01, 02 and 04 carried rework and 03, 05, 06 had none (first-pass 50% on each basis).

**Token reconciliation.**
- Measured transcript total (authoritative here): 76,597,502 tokens over 43 dispatches (sprint_metrics.mjs).
- Ledger-row sum: 4,420,558,279. The bundle states rows are overlapping orchestrator windows; the sum is an upper bound, not a total, about 58 times the measured figure.
- `sprint_total_tokens` from the session-totals digest: 3,462,214, which is below the measured subagent total, so it cannot be the whole sprint either.
- Reporter analysis pass: TBD — see token-ledger.jsonl post-dispatch.
- Divergence flag YES; Tooling is rated Red in §6.

**Attribution refusal (BUG-069).** The ledger digest carries `unattributed` rows: 10 dispatches, 3,250,790,631 tokens (about 74% of the ledger-row sum), meaning no dispatch marker was written for those dispatches. A per-agent cost table is therefore not published. The census is the finding: architect 9 dispatches, developer 12, qa 20, cleargate-wiki-contradict 1, general-purpose 1, code-simplifier 1, unattributed 10. Historical ledger rows were not repaired. USD cost is not computed (no trustworthy attributed total).

**Close-script skips used (recorded per instruction):**
- `CLEARGATE_SKIP_PARENT_ROLLUP=1`: after Step 2.6c auto-flipped EPIC-058, EPIC-061, EPIC-065 and SPRINT-47, it halted on 16 unrelated parents (BUG-119 class; SPRINT-41 and SPRINT-44 precedent).
- `CLEARGATE_SKIP_LIFECYCLE_CHECK=1`: after Step 2.6 passed clean (31 artifacts), because Step 2.6b false-positives on the SPRINT-41 Parking Lot bugs BUG-102..116 (SPRINT-44 precedent).

---

## §4 Observe Phase Findings

The bundle carries no sprint-plan §4 events slice; the findings below come from `intake.md`, the sandbox field-trial log and the plan §6 amendments. No UR:bug or UR:review-feedback was recorded.

### 4.1 Bugs Found (UR:bug)
| Date | Description | Resolution | Commit |
|---|---|---|---|
| (none) | | | |

### 4.2 Hotfixes Triggered
| ID | Trigger | Resolution | Commit |
|---|---|---|---|
| (none recorded; hotfix ledger not in the bundle) | | | |

### 4.3 Review Feedback (UR:review-feedback)
| Date | Description | Status (folded / deferred) | Deferred to / Rationale |
|---|---|---|---|
| (none) | | | |

### Findings for SPRINT-48 (intake.md and field trial, none entered into this sprint)

Highest impact first.
- **(medium) Stale evidence: `sha` is ignored.** After a recorder exit 2 an earlier `evidence/<ID>.json` stays and `proofStatus` ignores `sha`, so the Done guard or the walkthrough could read a pass recorded on an older commit. This lets an unproven item reach Done.
- **(medium) Item file not found reads as untiered.** `record_evidence.mjs` reports `no proof tier` (exit 2, which the barrier now passes under R3a) and `merge_story.mjs`/`update_state.mjs` set the item Done unguarded. Second way an unproven item reaches Done.
- **(medium) S47-5 architect view-only rule.** `architect.md`/`architect.toml` lack the "read the item only through the given Item file" rule (added to `qa.md` and `developer.md` only); a story-plan Architect read raw files in the sandbox, so a plan the Developer reads can carry a holdout.
- **(medium) S47-7 container holdout tests land in the unit set.** QA-Verify's container holdout tests sit in the default `go test ./...` and fail without a database, so every later item's unit proof needs container resources.
- **(medium) S47-4 SDR refuses a consumer of another item's `file_creates`** instead of ordering it after the creator; the orchestrator deferred the item and re-ran the SDR.
- (low) S47-6: a visible proof script or its data can reveal what a holdout checks. S47-1/2/3 were setup slips or known issues (future-dated fixture timestamps, collision script table-cell paths, CR-133 test-stack placeholder).
- (low) Lifecycle reconcile and dashboard treat only `Done` as finished; a `Sprint Review` item reads as unfinished there (`lifecycle-reconcile.ts:424,855`, `dashboard/collect.ts:121`).
- (low) A proof starting a `setsid` process that holds stdout keeps Node alive ~12 s after recording at ~5 s (fix: destroy the child streams in `finish()`).
- (low) Align `scanGherkinScenarios` with pinned P2; stale `.pending-task-*.json` sentinels make preflight check 4 report a dirty main; `cleargate-protocol.md` §23 barrier order omits the prove step.
- Sandbox note: the orchestrator's probing printed `TALLY_DB_URL` (masked as `***@`) in shell output; the sandbox DB port was also served by a local Homebrew Postgres, so container proofs used `docker exec` (unaffected).

### Release and Gate 4 state (done 2026-11-17, owner: "release it please. close the sprint.")
- Close ack pass (live 0.31.2 scripts, before the re-sync): sprint/S-47 merged to meta-repo main at 4f226642; `CLEARGATE_SKIP_PARENT_ROLLUP=1` and `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` as at the no-flag pass (BUG-119 class and the SPRINT-41 Parking Lot false positive).
- Live re-sync from cli main built as 0.32.0: `init --yes` added `lib/proof.mjs` and `record_evidence.mjs`; the other 24 drifted files byte-copied from the composed payload; `doctor` drift 0. `gate-checks.json` unchanged (no root test stack; the unit proof falls back to `qa.test`).
- Gate 4 suites on cli a77d36f built as 0.32.0: unit 5741 tests, 0 fail (`evidence/gate4-a77d36f-unit.log`); integration 57 fail, all in the 99cbfd7 baseline, none new (`evidence/gate4-failures-a77d36f.txt`). `goal_verdict` flipped to `met`.
- Released: cleargate 0.32.0 on npm (`latest`), release commit 43fc45d tagged `v0.32.0` and pushed with cli main; 263 files, 999.0 kB packed, shasum 507de089d47a814efbbf18cea729b4853f8ced11; prepublishOnly suite 5741 tests, 0 fail; outer `delivery/` unchanged across the publish.
- CR-128 (absorbed by STORY-065-01) and CR-129 (absorbed by STORY-065-06) archived as Completed with `superseded_by`.
- After the re-sync, meta-repo items drafted with the old live template fail `proof-declared`; SPRINT-48 preflight requires `proof_tier` on every in-scope story, CR and bug, whatever its age. Intended; tell the owner at SPRINT-48 planning.
- Known reds that clear at the re-sync (rule 19): `canonical-live-parity` 5a/5b/5c, `qa-content` slice parity, `template-stubs.integration`, `gate-section-index-pinning.live.integration` S1c, `sprint-execution-mirror.integration`, doctor drift lines.
- D.5.2 full-suite re-run on c782d3d: GREEN — unit 5741 tests, 0 fail (`evidence/consolidate-c782d3d-unit.log`); integration 959 run, 87 fail, the same 178 failing names as b4702a5, none new, none gone (`evidence/consolidate-failures-c782d3d.txt`). Consolidation kept and merged into cli `main` (orchestrator, local).

### Flashcard archival candidates
None proposed. The flashcard slice in the bundle covered the wrong window (2026-11-17 to 2026-11-21) and returned no entries, so no archival analysis was run from the bundle (see §5).

---

## §5 Lessons

### New Flashcards (Sprint Window)

The bundle's flashcard slice was built for window [2026-11-17, 2026-11-21] and reports no entries. Git history in the bundle shows `.cleargate/FLASHCARD.md` gained 2 lines in commit e2de7c11 (2026-11-16) but their text is not in the bundle, so they are not listed here. Bundle slice missing for the correct window; per the reporter contract the source file was not read.

| Date | Tags | Lesson |
|---|---|---|
| 2026-11-16 | (2 cards added in e2de7c11; text not in bundle) | not extracted |

### Flashcard Audit (Stale Candidates)
Not run: the audit needs FLASHCARD.md, which is outside the bundle. No stale flashcards detected from the bundle.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| (none identified) | | |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | New `proof_tier` and `## Proof` sections shipped in story, CR and bug templates; clean-room shows them and `proof-declared` fires on an unedited story |
| Sprint Plan Template usability | Green | The Proof column per item made rule 7 hand-recording straightforward |
| Sprint Report template (this one) | Yellow | Does not yet carry the Proof table or `goal_verdict` keys as shipped; both added by hand here per instruction. Bundle plan-§2 slice was empty, so GOAL_RELATION could not be quoted |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Yellow | Plans were detailed and mostly exact, but 04's sealed pins were wrong three times and 02's spec gap (live/human under `--worktree`) was only caught from 04's plan |
| Developer → QA artifact completeness | Green | QA-Verify passed first time on 03, 05, 06 |
| QA → Orchestrator kickback clarity | Green | Post-flight FAILs named files and behaviour precisely (CRLF, `__proto__`, untiered barrier) |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | Not verifiable from the bundle (slice window wrong) |
| Adjacent-implementation reuse rate | Green | Plans mandated reuse (`extractFailing`, `commandEnv`, isBlankOrPlaceholder); consolidation found one more reuse change (c782d3d) |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Max 1 qa and 1 arch bounce per item; cap is 3 |
| Three-surface landing compliance | Yellow | Canonical landed in cli; live deliberately held at 0.31.2 until Gate 4 (rule 11), so parity checks are red by design (87 vs 64 integration failures) |
| Circuit-breaker fires (if any) | Green | None |
| Close-script skips | Yellow | Two skip env vars used (parent rollup after 16 unrelated parents, BUG-119 class; lifecycle check, SPRINT-41 Parking Lot false positives). Same precedent as SPRINT-41/44; still unrepaired |
| Gaps in guarding Done | Yellow | Two paths still let an unproven item reach Done (stale evidence `sha` ignored; item file not found reads as untiered); see §4 |

### Lane Audit
No item was assigned `lane: fast` this sprint; no rows.

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| (none) | — | — | — | — | — |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend
`wiki/topics/hotfix-ledger.md` and the last four sprint reports are not in the bundle, so no trend was computed. No hotfix is recorded for this window. trend: not measured.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | No `## Script Incidents` cited in the material available; none aggregated |
| Token ledger completeness | Red | 10 `unattributed` dispatches (3.25B ledger-row tokens) and overlapping orchestrator-window rows; per-agent table refused |
| Token divergence finding | Red | ledger=4,420,558,279 measured=76,597,502 (about 58x); session total 3,462,214 is below measured. Reporter pass TBD, so this is not explained by the Reporter gap |

---

## Autonomy Warnings

`.cleargate/hook-log/autonomy-warnings.log` holds five AskUserQuestion entries, dated 2026-10-04, 2026-11-10, 2026-11-14, 2026-11-15T01:33Z and 2026-11-15T07:28Z. All predate the sprint window (2026-11-16). None recorded in the SPRINT-47 window.

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-11-16 | Reporter agent | Initial generation. `goal_verdict: partial`; D.5.2 full-suite re-run PENDING (orchestrator fills); orchestrator to flip to `met` after the post-re-sync integration re-run if it clears |
| 2026-11-16 | Orchestrator | D.5.2 filled: green on c782d3d (unit 0 fail; integration same 178 names as b4702a5). Consolidation merged into cli `main` at a77d36f. |
