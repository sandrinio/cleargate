# SPRINT-45 holdout recount (hand-counted oracle)

## 1. Header

- Who/when: a Claude subagent (Sonnet 5.5), 2026-11-14, for SPRINT-45's measurement-script holdout.
- Method: read-only. Listed subagent `.meta.json` / `.jsonl` files with throwaway one-off python listings (printing agentType, phase, description, first/last timestamp, line count and how each transcript ends), read workflow run summaries (`wf_*.json` results/logs/notes), read `state.json`, `events.jsonl`, sprint reports, the sprint plans' execution logs, and `git log`. Every count below was tallied by reading those listings. A `wc -l` / `awk` phase count was used only as an arithmetic cross-check of the hand tally (the totals matched). No reusable counting program was written. No `sprint_metrics*` or `subagent-ledger*` file was used.
- Timezones: transcript timestamps and events.jsonl are UTC. Git commit dates are +04:00 (SPRINT-44 execution-log "local" times are also +04:00).
- All transcripts were on disk, with the exceptions noted in 2.9 (three meta-only duplicate files).

| Sprint | Repo | Sprint window (UTC) | Sessions used | Workflow runs |
|---|---|---|---|---|
| ClearGate SPRINT-44 | ClearGate (+ nested cleargate-cli) | 2026-11-10T06:22:14Z (first state event) to 18:23Z (close). Ledger rows 06:22Z-18:19Z, all in session 11d4cf54 | `11d4cf54-bf8f-48fe-b10c-fadb7867e924` (60 top-level subagents; no workflows) | none (hand-dispatched Agent calls) |
| dispenser_adapter SPRINT-01 | dispenser_adapter | 2026-11-11T22:26:06Z to 2026-11-12T09:25:14Z | `429f7cd4` (preflight, SDR readers/synth), `1dc940ec` (M plans, workflow, consolidation, reporter); pre-sprint planning in `429f89ca` | `wf_21a860e5-945` (112 agents, 11 items, single launch, tag r1) |
| dispenser_adapter SPRINT-02 | dispenser_adapter | 2026-11-12T22:20:30Z to 2026-11-13T18:56:18Z | `5549e7e9` (SDR, first M-plan attempt), `f4b5e1a6` (M1/M3/M4, both workflows, consolidation, reporter), `3a9277ef` (SPIKE-001 and Sprint-3 side work running in the same window) | `wf_108bae04-5f1` (61 agents on disk; launched/resumed three times, see 2.8) and `wf_5da151fc-744` (79 agents) |

Session `3a9277ef` also holds SPRINT-03 workflows (`wf_0bb7f331`, `wf_01856b8c`); they start after SPRINT-02 closed and are out of scope.

## 2. Counting rules as applied

2.1 Roster = keys of `state.json` `stories` (SPRINT-44: STORY-062-01..06; SPRINT-01: STORY-001-01..11; SPRINT-02: STORY-002-01..11).

2.2 Attribution of a dispatch to an item: by an item ID in the `.meta.json` description. Accepted forms: full `STORY-062-04`; short `002-01` / `001-07` (NNN-NN, the dispenser workflow style, mapped to `STORY-NNN-NN`); bare `07` only in the single case "07 QA-Red: sign e2e stub replies" (SPRINT-02, mapped to STORY-002-07 because it is the only 07 in that sprint and its content is the stub fix for 07). A dispatch whose description names no item is sprint-level or unattributed (2.3). I did not infer attribution from transcript content except where flagged "by judgement".

2.3 Sprint-level (never counted to an item, even when a description names an item): SDR readers (`SDR reader STORY-...` name items but are design-review fan-out), SDR synth, milestone Architect plans (M1..M4; M3/M4 in SPRINT-44 do name a single story, counted under Architect for that item, see 2.5), contract cuts/merges (`Contract` phase), preflight devops, code-simplifier, QA consolidation, reporter, contradiction checks, wiki queries. "Unattributed" = no item ID and not obviously sprint-level (side work, spikes, drafting).

2.4 Window: dispatches whose first transcript timestamp is before the sprint's first state event are "pre-window" (planning, SDR in SPRINT-44, preflight) and are listed but not in the in-window totals. SDR/preflight in SPRINT-01/02 fall a minute or two after/before the first event; I applied the strict event-timestamp rule.

2.5 Columns:
- QA-Red = agentType `qa` with red intent (description or phase `QA-Red`, including `fix`/`re-scope` rounds and the orchestrator's top-level "07 QA-Red: sign e2e stub replies"). A dispatch that finds nothing to change still counts as a dispatch (SPRINT-02 STORY-002-07 "QA-Red fix 1 (Spec-Gap)").
- Developer = agentType `developer`, all phases. I split it into Build (phase Build / hand-dispatched Developer) and Integrate (phase Integrate, agentType developer, "integrate with main" work) because dependent items get Integrate dispatches by design. The literal rule uses Build+Integrate.
- QA-Verify = agentType `qa` with verify intent (phase Verify, plus phase `Pre-verify` "QA-Verify pre", counted as a verify dispatch). Aborted ("Request interrupted by user") dispatches are counted, and flagged.
- Architect = agentType `architect` dispatches whose description names the item: TPV, TPV re-check, post-flight, and (SPRINT-44 only) M3/M4 plans that name a single story. Workflow runs use `general-purpose` agents for "TPV scan" and "post-flight scan"; those are mechanical pre-gate script runners, listed as helpers, not Architect.
- Helpers = other agentTypes tied to the item: `general-purpose` (prepare, commit red, TPV scan, post-flight scan), `devops` (merge, integrate, preflight-free), listed with counts but never counted as rounds.
- Literal rework rounds = (QA-Red-1, floor 0) + (Developer-1, floor 0, Build+Integrate) + (QA-Verify-1, floor 0).
- Judged rework (my reading of what actually happened; recorded beside the literal number, never substituted for it): a round counts when work was redone because a test or implementation was found defective or a requirement changed after the first attempt. It excludes: (a) the contract-first two-pass design (SPRINT-01 STORY-001-02/03: QA-Red pass 1 + pass 2 and Developer pass 1 + pass 2 are planned, the runner cuts the contract between them); (b) Integrate dispatches (planned DAG integration), including repeat integrations forced by merge conflicts or a moved sprint branch; (c) `Pre-verify` plus final verify; (d) infrastructure replays: resume of a workflow re-running a Developer step on an already-merged item, API-403 retry of a helper, user-interrupted dispatches, merge refused because of an uncommitted main checkout; (e) re-verify/re-merge after (b)/(d).

2.6 Git (all repos involved; cleargate-cli for code and outer repo for planning in SPRINT-44; one repo for dispenser). Classified by subject prefix, not by substring (merge subjects like `merge(story/STORY-001-09): feat(EPIC-001): ...` contain `feat(` but are merges):
- red_written = first `qa-red(<ID>)` subject; red_corrected = each later `qa-red(<ID>)` subject (any suffix: pass 2, fix 1, re-scope).
- build = first subject starting `feat(` or `fix(` that names the ID; rework = each later `feat(`/`fix(` naming it, plus any subject containing `(rework)`. If the only feat commit carries `(rework)` it counts as build 1 AND rework 1 (same commit counted in both columns, as the literal rule reads). `chore(...)` / `docs(...)` / `test(...)` subjects naming the ID are not build.
- integrate = `integrate(<ID>)` prefix (SPRINT-44) or, in dispenser, `merge(sprint/S-0N): integrate <ID>` (the repo's integrate convention; it has no `integrate(` subjects). merged = `merge(story/<ID>)` prefix; `merge(STORY-002-02): contract C2 = ...` is a contract merge, not counted.
- Git rework = red_corrected + rework.
- Two-repo items count each repo's commits (SPRINT-44 STORY-062-01 has a cli and an outer commit of each kind).

2.7 state.json counters = `qa_bounces` / `arch_bounces` as stored (workflow result `counters` agree for the dispenser sprints).

2.8 Special cases (all recorded, none silently adjusted):
- SPRINT-02 `wf_108bae04-5f1`: one run id, three launches. Launch A 10:13-~10:50Z; the orchestrator log says the 02 "commit red" agent failed on an API 403 (transcript 10:18:35, 16 lines, ends on an assistant message), so the run was stopped and resumed (same run id). On resume the runner re-ran 002-01 Developer c1 and c2 although 002-01 was already merged (10:50:28 and 10:50:55; c2 ends `hook_cancelled`), re-ran 02 "commit red r1" (completed) and 02 "TPV scan r1" (user-interrupted); then it was stopped and relaunched with `merged0`/`cut0`. The final `wf_108bae04-5f1.json` says agentCount 46 but 61 agent transcripts for that run id are on disk, so the summary json under-reports dispatches. User interruptions also hit 002-05 post-flight (10:50:10) and 002-06 QA-Verify (10:49:14).
- SPRINT-02: r1 stopped at a spec-gap on 07 and 06's merge refused (dirty main checkout) -> r2 re-integrated and re-verified 06 and resumed 03/04/07 with `skipBuild`.
- Resumed sessions copy subagent `.meta.json` files from earlier sessions without transcripts (the same `toolUseId` appears four times: "Split 06, renumber, align stories", `revivedAt` set, in sessions 429f89ca (real), 429f7cd4, 1dc940ec, 5549e7e9 (meta only)). A scanner that reads every meta file would count that pre-sprint SPRINT-01 drafting dispatch four times and attribute three copies to the wrong sprints.

2.9 Meta files lacking transcripts: only the three duplicate "Split 06..." files above.

## 3. SPRINT-44 (ClearGate)

Sprint window 06:22:14Z-18:23Z. 60 subagent transcripts in session 11d4cf54. All hand-dispatched.

Columns: QA-Red | Dev (Build+Integrate) | QA-Verify | Architect (description-named) | helpers (devops) | rework literal / judged | git written/corrected/build/rework/integrate/merged | git rework | state qa/arch.

| item | QA-Red | Developer | QA-Verify | Architect | helpers | rework lit/judged | git w/c/b/r/i/m | git rework | state qa/arch |
|---|---|---|---|---|---|---|---|---|---|
| STORY-062-01 | 2 (QA-Red, QA-Red fix wiring) | 1 | 1 | 3 (TPV, TPV re-check, post-flight) | devops 2 (integrate with main, merge) | 1 / 1 | 1/1/2*/1*/1/2* | 2 (judged 1) | 0/1 |
| STORY-062-02 | 1 | 1 | 1 | 2 (TPV, post-flight) | devops 2 (integrate, merge) | 0 / 0 | 1/0/1/0/1/1 | 0 | 0/0 |
| STORY-062-03 | 1 | 1 | 1 | 2 | devops 1 (merge) | 0 / 0 | 1/0/1/0/0/1 | 0 | 0/0 |
| STORY-062-04 | 2 (QA-Red, QA-Red stale claims) | 2 (Developer, Developer integrate and fix) | 1 (integrated) | 3 (TPV, TPV re-check, post-flight) | devops 1 (merge) | 2 / 2 | 1/1/1/1/1/1 | 2 | 1/0 |
| STORY-062-05 | 1 | 1 | 1 | 3 (M3 plan, TPV, post-flight) | devops 1 (merge) | 0 / 0 | 1/0/1/0/0/1 | 0 | 0/0 |
| STORY-062-06 | 1 | 1 | 1 | 3 (M4 plan, TPV, post-flight) | devops 1 ("merge consolidation + 062-06", shared with the consolidation branch) | 0 / 0 | 0 strict (1 if `test(...)` counted)/0/1/0/0/1 | 0 | 0/0 |

\* 062-01 two-repo story: cli `defd3eb` + outer `783934d6` are both `feat(`; mechanically build 1 and rework 1 (the second feat is the outer-repo half of the same build, a false positive); merged has `2f99b7f` (cli) and `9f0935ac` (outer). Judged: build 1, rework 0, merged 1; git rework judged = 1 (the red correction `2c1cf6a`).
062-06's red commit is `test(EPIC-062): STORY-062-06 red tests` (24e0382), not `qa-red(...)`: strict classification yields red_written 0; semantically it is the red commit.

Git commits (cli unless noted): 01 qa-red fa39ae8, 2c1cf6a; feat defd3eb + outer 783934d6; integrate e5e3a5f; merge 2f99b7f + outer 9f0935ac. 02 qa-red 52989fa; feat 7e24a97; integrate a9ab8f8; merge 0e60fbd. 03 qa-red 8f89633; feat eeaa8b4; merge 3d2d05f. 04 qa-red a41bc6b, 1624636; feat 39a513c, ca2b644; integrate 5dcae45; merge 8f71c87. 05 qa-red 7299d64; feat a4ddda5; merge 4200799. 06 test 24e0382; feat 450e8e1; merge b98fd0c. No `(rework)` subjects. Contract commits C1-C4 (e06cac8, 343c989, 1cdd65d, d6c74ac) are `chore(EPIC-062)` and name no story.

Dispatch totals SPRINT-44:
- Attributed to items by description: 45 (01: 9, 02: 7, 03: 6, 04: 9, 05: 7, 06: 7).
- Sprint-level in window: 6 (Architect M1 plan, Architect M2 plan, "Developer contract step C0" (a `developer` dispatch that serves all four initial stories), code-simplifier cleanup, QA consolidation full-suite run, Reporter).
- Unattributed by description but attributable by judgement: 2 ("Architect amend M2 for stale claims" -> STORY-062-04; "Wiki query: dashboard ticket viewer" -> prior-work check before STORY-062-05's scope-add).
- Pre-window (planning): 7 ("Prior-work query: dashboard board", four "SDR reader STORY-062-0N", "SDR synth SPRINT-44", "Preflight devops reachability").
- Total 45 + 6 + 2 + 7 = 60. Unattributed list: Architect amend M2 for stale claims; Wiki query: dashboard ticket viewer.
- If Architect-amend is attributed to 04 by judgement, 04's Architect count is 4.

Rework notes SPRINT-44:
- 062-01: the QA-Red fix was a genuine red correction after a TPV BLOCKED-WIRING-GAP (`startServer()` returned the port before `listening`), counted by `arch_bounces` 1, not by `qa_bounces`.
- 062-04: second QA-Red (stale-claims red file) and second Developer ("integrate and fix") were caused by a requirement clarification found at 062-02's post-flight (M2 predated the clarified R2), not by a defect in 04's own first-round work; the Developer #2 also performed the planned integration of cli main. The orchestrator recorded it as `qa_bounces` 1 although QA-Verify never failed (the only QA-Verify ran on the integrated tree and passed). Rule note: the rule gives 2 rework rounds; the QA-Verify bounce the counter shows does not correspond to any QA-Verify dispatch.
- The DevOps dispatches for 062-01 (07:41Z-17:36Z) and 062-04/-05 (to 13:30Z) ran for hours because of orphaned background waits the orchestrator later stopped; they are single dispatches, not repeats.

## 4. dispenser_adapter SPRINT-01

Workflow `wf_21a860e5-945`: single launch, 112 agents, all items GREEN, all counters 0. Attribution is by the `NNN-NN` short ID. Per item gp helpers = prepare, commit red, TPV scan, post-flight scan (+ extra commit-red/TPV-scan for pass 2 and fix rounds).

| item | QA-Red | Dev Build | Dev Integrate | QA-Verify | Architect | helpers | rework lit / judged | git w/c/b/r/i/m (mechanical) | git rework mech / judged | state qa/arch |
|---|---|---|---|---|---|---|---|---|---|---|
| STORY-001-01 | 1 | 1 | 0 | 1 | 0 | gp 4, devops 1 | 0 / 0 | 1/0/1/0/0/1 | 0 / 0 | 0/0 |
| STORY-001-02 | 2 (pass 1, pass 2) | 2 (pass 1 c1, c1) | 0 | 1 | 0 | gp 6, devops 1 | 2 / 0 (two-pass design) | 1/1/1/1/0/1 | 2 / 0 | 0/0 |
| STORY-001-03 | 2 (pass 1, pass 2) | 2 | 1 | 1 | 0 | gp 6, devops 1 | 3 / 0 (two-pass design) | 1/1/1/1/1/1 | 2 / 0 | 0/0 |
| STORY-001-04 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 / 0 | 0/0 |
| STORY-001-05 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 / 0 | 0/0 |
| STORY-001-06 | 1 | 1 | 0 | 1 | 0 | gp 4, devops 1 | 0 / 0 | 1/0/1/0/0/1 | 0 / 0 | 0/0 |
| STORY-001-07 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 / 0 | 0/0 |
| STORY-001-08 | 2 (all r1, fix 1) | 2 (c1, c2) | 0 | 1 (c2 only) | 0 | gp 5, devops 1 | 2 / 2 | 1/1/1*/1*/0/1 | 2 / 2 | 0/0 |
| STORY-001-09 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 / 0 | 0/0 |
| STORY-001-10 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/1/1/1 | 1 / 1 | 0/0 |
| STORY-001-11 | 2 (all r1, fix 1) | 2 (c1, c2) | 1 | 1 (c2 only) | 0 | gp 5, devops 1 | 3 / 2 | 1/1/1*/1*/1/1 | 2 / 2 | 0/0 |

\* the only feat commit is subject-tagged `(rework)` (9e626c4 for 08, cf93efb for 11): counted as build 1 and rework 1 by the literal rule.

Git detail: 01 qa-red e2cafde, feat b5313a2, merge a86becb. 02 qa-red 7888c91 (pass 1), ab8a896 (pass 2); feat 2f95611 (contract C1), 64921f7; merge 4a6b171. 03 qa-red 4563635 (pass 1), a89012f (pass 2); feat 2fe87c7 (contract C2), 0140c57; integrate df5d8ce; merge d39f555. 04 qa-red 51ff4ee; feat 7ef86ee; integrate 85c8b3e; merge fec5b16. 05 qa-red ddbefb0; feat 91fdd7a; integrate 5dad3e2; merge 9ef3d02. 06 qa-red df9e157; feat be68d55; merge eb2f56a. 07 qa-red cae71e0; feat 69667f5; integrate 52a38cb; merge 132a3e6. 08 qa-red 8ad822f, dfc150d; feat 9e626c4 (rework); merge 6ddfdab. 09 qa-red 6149390; feat 160f7ef; integrate dbdcc1f; merge 9cdaafc. 10 qa-red 0ed607c; feat 886a55d; fix 9750886 ("after integrating sprint/S-01", made by the integrate step after a `make e2e` flake); integrate abdec43; merge 410d1c8. 11 qa-red b6210c0, dc6f75b; feat cf93efb (rework); integrate d455186; merge f5716be.

Dispatch totals SPRINT-01 (window 2026-11-11T22:26Z-2026-11-12T09:25Z):
- Attributed to items: 109 (QA-Red 15, Dev Build 15, Dev Integrate 7, QA-Verify 11, gp helpers 50, devops merge 11). Architect dispatches attributed to items: 0 (TPV is a gp script scan, "TPV skipped" in every result).
- Sprint-level in window: 22 = 19 top-level (4 Architect plans M1..M4 [M1 = 001-01 only, M2 = 02,03,05, M3 = 04,06,07,08,09, M4 = 10,11], 11 SDR readers, 1 SDR synth, code-simplifier, QA consolidation re-run, Reporter) + 3 workflow contract cuts. Preflight devops (22:25:44Z) is 22 s before the first event, so strictly pre-window.
- Unattributed by description: 3 ("Contract: cut C1", "cut C2", "cut C3"; the runner script shows C1 owned by 001-02, C2 by 001-03, C3 by 001-09). No other unattributed dispatches in window.
- Pre-window: 7 (preflight devops; wiki prior-work query, "Draft stories 01, 05, 08", "02, 03, 04", "06, 07, 09", "Split 06, renumber, align stories", "Apply owner decisions to stories", all session 429f89ca on 11-11 19:34-20:36Z) = 1 + 6.
- Window total = 109 item + 22 sprint-level = 131 (cross-check: 112 workflow + 19 top-level). The 3 contract cuts are the only dispatches with no item ID in the description.
- Duplicate meta: "Split 06..." appears in 1dc940ec, 429f7cd4 without transcript (see 2.8).

Rework notes SPRINT-01:
- 08 and 11: Developer c1 hit a test-pattern block (red test defect), QA-Red corrected the test (fix 1), Developer c2 committed the already-written implementation unchanged. Genuine red-correction rework; QA-Red rework is invisible to the counters (report says so).
- 02 and 03: literal rule gives 2 and 3 rework rounds but pass 1/pass 2 is the planned two-pass contract design (sprint-context rule 17); the rule misdescribes them. 03's literal figure also includes its planned Integrate.
- Integrate dispatches (7) are `developer`-typed; the literal rule inflates 04, 05, 07, 09, 10 by 1 each for planned integration.

## 5. dispenser_adapter SPRINT-02

Two workflow runs. r1 (`wf_108bae04-5f1`, 3 launches, final summary 46 agents but 61 on disk) and r2 (`wf_5da151fc-744`, 79 agents). All 11 items ended GREEN, all counters 0.

| item | QA-Red | Dev Build | Dev Integrate | QA-Verify | Architect | helpers | rework lit / judged | git w/c/b/r/i/m (mechanical) | git rework | state qa/arch |
|---|---|---|---|---|---|---|---|---|---|---|
| STORY-002-01 | 1 | 3 (1 real + 2 resume replays) | 0 | 1 | 0 | gp 4, devops 1 | 2 / 0 | 1/0/1/0/0/1 | 0 | 0/0 |
| STORY-002-02 | 1 | 1 | 0 | 1 | 0 | gp 6 (commit red x2 [first hit API 403], TPV scan x2 [first interrupted], prepare, post-flight), devops 1 | 0 / 0 | 1/0/1/0/0/1 | 0 | 0/0 |
| STORY-002-03 | 2 (r1, re-scope) | 1 | 2 (integrate, integrate r2) | 1 | 0 | gp 5, devops 1 | 3 / 1 | 1/1/1/0/1/1 | 1 | 0/0 |
| STORY-002-04 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 | 0/0 |
| STORY-002-05 | 1 | 1 | 1 | 1 | 0 | gp 5 (post-flight x2, first interrupted), devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 | 0/0 |
| STORY-002-06 | 1 | 1 | 2 (r1, r2) | 3 (r1 interrupted, r1 completed, r2 re-verify) | 0 | gp 5 (post-flight x2), devops 2 (r1 merge refused, r2 merge) | 4 / 0 | 1/0/1/0/2/1 | 0 | 0/0 |
| STORY-002-07 | 3 (r1; "fix 1 (Spec-Gap)", no change; top-level "07 QA-Red: sign e2e stub replies") | 2 (c1 blocked/uncommitted; c1 r2 committed) | 1 | 2 (Pre-verify, Verify) | 0 | gp 4, devops 1 | 5 / 2 | 1/1/1/0/1/1 | 1 | 0/0 |
| STORY-002-08 | 1 | 1 | 3 | 3 | 0 | gp 6 (post-flight x3), devops 3 (two merges aborted on docs/site/architecture.html conflict) | 5 / 0 | 1/0/1/0/3/1 | 0 | 0/0 |
| STORY-002-09 | 2 (r1, fix 1) | 2 (c1, c2) | 2 | 2 (c2, then c1 after re-integration) | 0 | gp 6 (commit red x2, post-flight x2, prepare, TPV), devops 2 (first merge conflicted) | 5 / 2 | 1/1/1*/1*/2/1 | 2 | 0/0 |
| STORY-002-10 | 2 (r1, fix 1) | 2 (c1, c2) | 0 | 1 (c2) | 0 | gp 5, devops 1 | 2 / 2 | 1/1/1*/1*/0/1 | 2 | 0/0 |
| STORY-002-11 | 2 (r1, re-scope) | 1 | 2 (integrate, integrate r2) | 1 | 0 | gp 5, devops 1 | 3 / 1 | 1/1/1/0/1/1 | 1 | 0/0 |

\* only feat commit carries `(rework)` (786e69e for 09, a81823d for 10).

Git detail: 01 qa-red 0d64dd0; feat 1bcdfbf (`chore` f2e99b7 goose bump is not build); merge 67f8e79. 02 qa-red bec39fd; feat ebc1df5; merge 87f6117 (4098855 is a contract merge). 03 qa-red ea3adf1, 550ba6f (re-scope); feat 5173ad6; integrate 6ad6af8; merge b7b16a2. 04 qa-red 90341fd; feat c275bf4; integrate 8626203; merge 00c28a6. 05 qa-red 0f9e59e; feat 2229887; integrate b0601e8; merge 6d28cb4. 06 qa-red ee28922; feat c56cb51; integrate f7d1344, f6bf110; merge 92e0b50. 07 qa-red 0660261, d4fd3bc (re-scope); feat f3539a2; integrate 6abe14b; merge f4644cb. 08 qa-red 8a8a32f; feat d0346b5; integrate b770fc5, 8248cf8, 03c83aa; merge 5b9257e. 09 qa-red 07cd3df, 53eb32d; feat 786e69e (rework); integrate 419bad8, d635efc; merge d7f3744. 10 qa-red a71a784, 0257262; feat a81823d (rework); merge 6c1c25e. 11 qa-red 739cbe6, 13bf177 (re-scope); feat ef27f23; integrate 0c61871; merge 2ac2c8b. The one direct sprint-branch commit 9017d38 (docs) names no item.

Dispatch totals SPRINT-02 (window 2026-11-12T22:20:30Z-2026-11-13T18:56Z):
- Attributed to items: 134 = 133 workflow dispatches (QA-Red 16, Build 16, Integrate 14, Verify 17 incl. 1 Pre-verify, devops merge 15, prepare 11, commit-red 16, TPV scan 12, post-flight 16) + 1 top-level QA-Red (07). (Workflow total 140 = 133 + 7 contract cuts/merges.)
- Sprint-level in window: 29 = 7 contracts (cut C1, cut C5, merge C2, cut C3, cut C4, cut C6, cut C7) + 11 SDR readers + SDR synth + 7 Architect M-plan dispatches (first attempt M1-M4 at 09:06Z in 5549e7e9; only M2 produced a plan, M1/M3/M4 were lost to a session interruption and re-dispatched 09:39Z in f4b5e1a6 = 4 + 3) + code-simplifier + QA consolidation + Reporter.
- Unattributed (17): Wiki duplicate check: tank calibration; Duplicate check: UI prototype; Contradiction check SPIKE-001; Generate sample week via hub; Prototype: Overview and Stations; Prototype: Problems and Reports; Prototype: Settings; Prototype: charts with visx; Duplicate check: docs site check; Prior-work check: vendor adapters; Contradiction check CR-001; Prior-work check: Sprint 3 epic; Contradiction check EPIC-003; Draft stories 01-03 (adapters); Draft stories 04, 08, 12 (status); Draft stories 05, 06, 09 (configuration); Draft stories 07, 10, 11, 13 (all SPIKE-001 / Sprint-3 planning in session 3a9277ef or f4b5e1a6, not SPRINT-02 work).
- Window total = 134 + 29 + 17 = 180.
- Pre-window (19): 12 "Contradiction check SPRINT-02 / STORY-002-01..11" (22:06Z), Preflight devops (22:19Z), wiki "Duplicate check for EPIC-002", "Check latest stable versions for Sprint 2", four "Write stories ..." forks (11-12 09:42-18:46Z).

Rework notes SPRINT-02:
- Genuine: 03 and 11 (QA-Red re-scope after integration; upstream change invalidated existing red tests), 07 (spec gap: stale s5Hub stub; the correction was done by the orchestrator's top-level QA-Red dispatch, the workflow's "fix 1" dispatch changed nothing; Developer re-run to commit), 09 and 10 (Developer test-pattern block -> QA-Red fix -> Developer c2).
- Not defect rework but inflate the literal rule: 01 (two replayed Developer dispatches after a resume), 06 and 08 (re-integrate/re-verify/re-merge forced by a dirty main checkout and by docs/site/architecture.html merge conflicts), 02/05/06 (helper retries and user-interrupted dispatches), 07's planned Pre-verify.
- Orchestrator report says "QA-Red corrected its own tests once each for 09 and 10, re-scoped red tests for 03 and 11, 4 Developer blocks (03, 07, 09, 10)"; it does not mention 01's replays or 06/08's re-integrations.

## 6. Totals

| Sprint | Items | Literal rework (dispatch rule) | Judged rework | Git rework (mechanical) | Git rework (judged) | state.json qa+arch |
|---|---|---|---|---|---|---|
| SPRINT-44 | 6 | 3 | 3 | 4 (062-01: 2 incl. false positive, 062-04: 2) | 3 | 1 + 1 = 2 |
| SPRINT-01 | 11 | 15 | 4 | 9 | 5 | 0 |
| SPRINT-02 | 11 | 31 | 8 | 7 | 7 | 0 |

Dispatch totals: SPRINT-44 60 = 45 item-attributed + 8 sprint-level/ambiguous in window + 7 pre-window. SPRINT-01 131 in window (109 item, 22 sprint-level) + 7 pre-window. SPRINT-02 180 in window (134 item, 29 sprint-level, 17 unattributed) + 19 pre-window.

## 7. Disagreements (dispatch rework vs git vs counters)

1. SPRINT-44 STORY-062-04: dispatch literal 2, git 2, counters qa=1. Counter increments on an event that is not a QA-Verify failure (the one QA-Verify passed); the rework is QA-Red + Developer after a requirement clarification. Counter total 1 vs 2 rounds.
2. SPRINT-44 STORY-062-01: dispatch 1, counters arch=1 (TPV BLOCKED), git 2 mechanical vs 1 judged (outer-repo feat commit double-counts the build; counter correctly 1 round, mapped to arch not qa).
3. SPRINT-44 STORY-062-06: git red_written is 0 under the strict `qa-red(` rule because the red commit is `test(EPIC-062)`; dispatch count is unaffected.
4. SPRINT-01 STORY-001-02/03: dispatch literal 2/3, git mechanical 2/2, but judged 0 (contract two-pass design); counters 0.
5. SPRINT-01 STORY-001-08/11: dispatch 2, git 2, counters 0: QA-Red corrections and Developer re-dispatch invisible to counters (as the report itself says).
6. SPRINT-01 STORY-001-10: git rework 1 (a `fix(` after integrating, committed by the integrate step), dispatch rework 1 literal only from the Integrate dispatch; judged dispatch 0 but git judged 1: no extra dispatch exists for this fix.
7. SPRINT-01 04/05/07/09: literal dispatch rework 1 each purely from planned Integrate dispatches; git 0; counters 0.
8. SPRINT-02 STORY-002-01: dispatch literal 2 from two resume replays of a Developer step on an already-merged item; git 0; counters 0 (infrastructure artifact).
9. SPRINT-02 STORY-002-06 and 002-08: dispatch literal 4 and 5 (re-integrations, repeat verifies/merges after conflicts and a dirty checkout), git rework 0 (but 2 and 3 integrate commits), counters 0.
10. SPRINT-02 STORY-002-07: dispatch literal 5, git 1 (the re-scope red commit d4fd3bc; the re-run Developer made no extra feat commit because the first attempt left its work uncommitted), counters 0. Part of the QA-Red work came from an orchestrator top-level dispatch, outside the workflow summary.
11. SPRINT-02 STORY-002-03 and 002-11: dispatch literal 3, git 1 (one re-scope red commit); the second Integrate dispatch left no commit.
12. SPRINT-02 STORY-002-09/10: dispatch 5/2, git 2/2 (09's literal figure includes re-integration and re-verify after a merge conflict; judged 2 matches git).
13. All dispenser sprints: counters 0 everywhere, while judged rework is 4 (SPRINT-01) and 8 (SPRINT-02) rounds and git red-correction/rework commits total 9 and 7.
