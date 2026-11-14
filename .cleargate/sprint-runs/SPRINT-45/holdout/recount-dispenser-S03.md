# SPRINT-45 holdout recount: dispenser_adapter SPRINT-03 (hand-counted oracle)

## 1. Header

- Who/when: a Claude subagent (Sonnet 5.5), 2026-11-14, for SPRINT-45's measurement-script holdout. Follows `recount.md` section 2 rules exactly (roster, attribution 2.2, sprint-level 2.3, window 2.4, columns 2.5, git 2.6).
- Method: read-only. Throwaway one-off python listings (kept in the scratchpad, not in any repo) printed per transcript: session, workflow run, agentType, `.meta.json` description, first/last timestamp, line count, and a dedup'd token tally. Read `state.json`, `events.jsonl`, workflow run summaries (`wf_01856b8c`, `wf_0bb7f331` json: args, logs, counters, notes), a few report headers, and `git log --all`. Per-item counts were tallied from the listing grouped by the description's item ID, then cross-checked by arithmetic (column sums 32+32+13+17+16+79 = 189 item dispatches; 189 + 36 sprint-level = 225 in window). No `sprint_metrics*`, `subagent-ledger*`, `count_tokens*`, `metrics.json` file was opened, run or imported.
- Sprint state at cutoff: 17 items on the roster (STORY-003-01..15 plus BUG-001 and BUG-002, which was added mid-sprint at 2026-11-14T05:20Z by the orchestrator). 16 Done, STORY-003-15 Bouncing. All state.json `qa_bounces` / `arch_bounces` are 0.
- Timezones: transcripts, events.jsonl and cutoff are UTC. Git commit dates are +04:00 (cutoff = 13:40+04:00 on 2026-11-14; the last commit `f717aab` is 13:27:54+04:00 = 09:27:54Z, inside the cutoff).
- Window: start = first `events.jsonl` timestamp = **2026-11-13T19:54:54.619Z** (the `migration` genesis events). Cutoff = **2026-11-14T09:40:00Z**. No dispatch or commit exists after the cutoff on disk or in git.

| Sprint | Repo | Window (UTC) | Sessions | Workflow runs |
|---|---|---|---|---|
| dispenser_adapter SPRINT-03 | dispenser_adapter | 2026-11-13T19:54:54Z to 2026-11-14T09:40:00Z (last in-window dispatch starts 09:27:47Z; last transcript line 09:39:43Z) | all 225 in-window dispatches are in `3a9277ef` (orchestrator session). Other sessions (`429f7cd4`, `1dc940ec`, `5549e7e9`, `f4b5e1a6`, `80cafed7`, `429f89ca`) hold nothing at or after the window start. | `wf_01856b8c-d1a` (r1, 12 agents, 21:22Z, ended with 003-01 BLOCKED), `wf_0bb7f331-df9` (r2, 181 agents on disk and in its summary, 00:00-04:46Z, run ended with 003-15 BLOCKED), `wf_650c9f1f-8a7` (r3, 13 agents, 08:21-09:39Z, no summary json on disk) |

All transcripts were on disk for in-window dispatches. 225 = 12 + 181 + 13 workflow agents + 19 top-level (16 SDR readers, SDR synth, 2 wiki checks).

## 2. Rule applications specific to this sprint

- Roster = state.json `stories` keys = 17 items. Attribution by description: `003-NN` short form (workflow style) or `BUG-00N`. No bare-number case.
- Sprint-level (2.3): SDR readers (name an item, still design-review fan-out), SDR synth, the 8 milestone Architect plans (`M1 plan` .. `M8 plan`; descriptions name no item and the plans are workflow architects), contract dispatches (`cut C1`, `cut C2`, `cut C3`, `C4 prepare`, `C4 skeleton` (a `developer` dispatch, analogue of SPRINT-44 "contract step C0"), `C4 cut`, `cut C5`, `cut C6`, `cut C7`), and the two wiki/contradiction checks that name BUG-002 (`Duplicate check for BUG-002`, `Contradiction check BUG-002`, 04:50Z and 04:53Z, before BUG-002 was in the workflow). Per 2.3 these never count to an item.
- Architect column: 0 for every item. TPV is a `general-purpose` script scan ("TPV skipped" in every result) and every post-flight says "Architect pass skipped". Plans are sprint-level.
- Dev Integrate = `developer` dispatches whose description says `integrate` (incl. `integrate r2`). Dev Build = `developer cN`.
- QA-Red = `qa` description containing QA-Red (`r1`, `fix N`, `re-scope r1`, `fix 1 (Spec-Gap)`). QA-Verify = `qa` description QA-Verify (`c1`..`c3`). There is no `Pre-verify` dispatch in this sprint.
- Git integrate = `merge(sprint/S-03): integrate <ID>` subjects. Merged = `merge(story/<ID>)`. Contract cuts are branch pointers (`contract/S-03-*`), not commits. There are no `chore`/`docs` commits naming an item and no commit without an item ID in the window (78 commits, all name a STORY or BUG).
- Git build/rework: this sprint's workflow tags the commit made after a QA-Red correction `(rework)`. Rule 2.6 applied literally: if the only feat/fix commit carries `(rework)` it counts as build 1 and rework 1. Where two feat commits both carry `(rework)` (003-14) both are rework, the first is also build.
- 003-05: the first `feat(` naming it is the C4 skeleton commit `b20e379` ("C4 skeleton, the price seam of STORY-003-05"), a contract commit, not the story build. Mechanical: build 1 (the skeleton) and rework 1 (`ee32430 (rework)`). Judged equals mechanical here (the (rework) commit is the real build; the skeleton is a contract artifact), so the total is unaffected.

## 3. Per-item table

Columns: QA-Red | Dev Build | Dev Integrate | QA-Verify | Architect | helpers | rework literal / judged | git w/c/b/r/i/m (mechanical) | git rework mech / judged | state qa/arch.

Literal rework = (QA-Red-1) + (Dev Build + Dev Integrate - 1) + (QA-Verify-1), each floored at 0.

| item | QA-Red | Dev Build | Dev Integrate | QA-Verify | Architect | helpers | rework lit / judged | git w/c/b/r/i/m | git rework mech / judged | state qa/arch |
|---|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | 0 | 1 | 0 | 1 | 0 | gp 1 (prepare), devops 1 | 0 / 0 | 0/0/1/0/0/1 | 0 / 0 | 0/0 |
| BUG-002 | 2 (r1, fix 1) | 2 (c1, c2) | 0 | 1 (c2) | 0 | gp 5, devops 1 | 2 / 2 | 1/1/1*/1*/0/1 | 2 / 2 | 0/0 |
| STORY-003-01 | 2 (r1, fix 1) | 2 (c1 in r1, c1 again in r2) | 0 | 1 | 0 | gp 5, devops 1 | 2 / 2 | 1/1/1*/1*/0/1 | 2 / 2 | 0/0 |
| STORY-003-02 | 3 (r1, fix 1, fix 2) | 3 (c1, c2, c3) | 1 | 1 (c3) | 0 | gp 6, devops 1 | 5 / 4 | 1/2/1*/1*/1/1 | 3 / 3 | 0/0 |
| STORY-003-03 | 2 (r1, fix 1) | 2 | 1 | 1 (c2) | 0 | gp 5, devops 1 | 3 / 2 | 1/1/1*/1*/1/1 | 2 / 2 | 0/0 |
| STORY-003-04 | 2 | 2 | 1 | 1 (c2) | 0 | gp 5, devops 1 | 3 / 2 | 1/1/1*/1*/1/1 | 2 / 2 | 0/0 |
| STORY-003-05 | 2 | 2 | 1 | 1 (c2) | 0 | gp 5, devops 1 | 3 / 2 | 1/1/1**/1/1/1 | 2 / 2 | 0/0 |
| STORY-003-06 | 2 | 2 | 1 | 1 (c2) | 0 | gp 5, devops 1 | 3 / 2 | 1/1/1*/1*/1/1 | 2 / 2 | 0/0 |
| STORY-003-07 | 3 (r1, fix 1, re-scope r1) | 2 (c1, c2) | 2 (integrate, integrate r2) | 1 (c2) | 0 | gp 6 (commit re-scope extra), devops 1 | 5 / 3 | 1/2/1/1/1/1 | 3 / 3 | 0/0 |
| STORY-003-08 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 / 0 | 0/0 |
| STORY-003-09 | 1 | 1 | 0 | 1 | 0 | gp 4, devops 1 | 0 / 0 | 1/0/1/0/0/1 | 0 / 0 | 0/0 |
| STORY-003-10 | 2 | 2 | 1 | 1 (c2) | 0 | gp 5, devops 1 | 3 / 2 | 1/1/1*/1*/0/1 | 2 / 2 | 0/0 |
| STORY-003-11 | 2 | 2 | 0 | 1 (c2) | 0 | gp 5, devops 1 | 2 / 2 | 1/1/1*/1*/0/1 | 2 / 2 | 0/0 |
| STORY-003-12 | 1 | 1 | 1 | 1 | 0 | gp 4, devops 1 | 1 / 0 | 1/0/1/0/1/1 | 0 / 0 | 0/0 |
| STORY-003-13 | 3 (r1, fix 1, fix 2) | 3 (c1, c2, c3) | 1 | 1 (c3) | 0 | gp 6, devops 1 | 5 / 4 | 1/2/1*/1*/1/1 | 3 / 3 | 0/0 |
| STORY-003-14 | 2 | 3 (c1, c2, c3) | 1 | 2 (c2 FAIL, c3 PASS) | 0 | gp 5, devops 1 | 5 / 4 | 1/1/1***/2/1/1 | 3 / 3 | 0/0 (wf result says qa 1) |
| STORY-003-15 | 2 (r1, fix 1 Spec-Gap) | 1 | 1 (09:27Z, top-level of r3) | 0 | 0 | gp 3 (prepare, commit red, TPV), no devops | 2 / 0 | 1/0/1/0/1/0 | 0 / 0 | 0/0 (Bouncing) |

\* the only feat/fix commit is `(rework)`-tagged: counted build 1 and rework 1 by 2.6 (BUG-002 `e10932c`, 01 `76f29ec`, 02 `c49bf51`, 03 `60e3cb3`, 04 `420ff89`, 06 `d0dcbce`, 10 `2f8a900`, 11 `ba93fd8`, 13 `1c1fe43`).
\*\* 05: build = C4 skeleton `b20e379`; `ee32430 (rework)` is the second feat, counted rework 1 (see section 2).
\*\*\* 14: both feat commits carry `(rework)` (`68a2ad6`, `780fdb9`); first is build, both are rework (2).

Column sums: QA-Red 32, Dev Build 32, Dev Integrate 13, QA-Verify 17, gp 79, devops 16 = 189 item-attributed dispatches. Per item: BUG-001 4, BUG-002 11, 01 11, 02 15, 03 12, 04 12, 05 12, 06 12, 07 15, 08 9, 09 8, 10 12, 11 11, 12 9, 13 15, 14 14, 15 7.

Git detail (sprint repo, one repo): 
- BUG-001 fix fa92a9a; merge e17b42f. BUG-002 qa-red 81eecf4, 8b5b8b1 (fix 1); fix e10932c (rework); merge 306dee1.
- 01 qa-red b37b4a1, cacf56f; feat 76f29ec (rework; also the C1 cut); merge 3be14e4.
- 02 qa-red 7eeb989, 4de302c, eb51363; feat c49bf51 (rework; C2 cut); integrate cc5a4ba; merge 2eeb1b4.
- 03 qa-red 5f33131, 88a5063; feat 60e3cb3 (rework; C3 cut); integrate 58932ec; merge cd232b3.
- 04 qa-red 34f7af5, f96c659; feat 420ff89 (rework; C5 cut); integrate 33bec7a; merge 63c5781.
- 05 qa-red 99825ce, 417e799; feat b20e379 (skeleton), ee32430 (rework); integrate 7773c64; merge f076883.
- 06 qa-red 1ddf9f0, 97b27c0; feat d0dcbce (rework; C6 cut); integrate 9f3205b; merge b0d6fd7.
- 07 qa-red c634cf2, aac2570 (fix 1), bbb5d03 (re-scope); feat 22fc7bc, cca5f8c (rework, an empty marker commit by the dev report); integrate 941cf74; merge 373da09.
- 08 qa-red ec9b977; feat c372d74; integrate af9624e; merge 6699acf.
- 09 qa-red e855e1d; feat 1050154; merge 9ab5801.
- 10 qa-red d45719d, 134cdbc; feat 2f8a900 (rework); merge af2783a (no integrate commit).
- 11 qa-red 7870654, 06d1c9a; feat ba93fd8 (rework); merge 0940bb2.
- 12 qa-red 7bc1494; feat 95f81bf (C7 cut); integrate d51d63e; merge 45d5c16.
- 13 qa-red 9fdf1c8, 0ffabae, f597c23; feat 1c1fe43 (rework); integrate d362dae; merge 3b606ab.
- 14 qa-red f80379c, b15cf82; feat 68a2ad6, 780fdb9 (both rework); integrate 8d00e1b; merge 189bae7.
- 15 qa-red 067f233 (no correction commit); feat 872dddd; integrate f717aab (sprint branch, 13:27+04); not merged (Bouncing).
- Pre-window commit `e4041b0` ("plan: Sprint 3 ready", 23:53:34+04 = 19:53:34Z) is 80 s before the window start and excluded.

## 4. Totals

| Sprint | Items | Literal rework (dispatch rule) | Judged rework | Git rework (mechanical) | Git rework (judged) | state.json qa+arch |
|---|---|---|---|---|---|---|
| dispenser SPRINT-03 (to cutoff) | 17 | 45 | 31 | 28 | 28 | 0 + 0 = 0 |

Judged rework per item: BUG-001 0, BUG-002 2, 01 2, 02 4, 03 2, 04 2, 05 2, 06 2, 07 3, 08 0, 09 0, 10 2, 11 2, 12 0, 13 4, 14 4, 15 0 = 31.

Judged reasoning (2.5 exclusions applied): a round counts when work was redone because a red test was found defective (Developer test-pattern block, then QA-Red fix N, then Developer re-run) or a requirement changed (re-scope), or QA-Verify failed. Integrate dispatches are excluded, as in SPRINT-01/02 (13 of them; they explain most of the gap between 45 and 31).
- Items with one fix cycle (QA-Red fix 1 plus Developer c2): BUG-002, 01, 03, 04, 05, 06, 10, 11 = 2 each. In 07, 14 and others the Developer c2 only committed the already-written implementation unchanged (07 produced an empty marker commit), which earlier recounts also counted (001-08/11).
- 02 and 13 had two fix cycles (fix 1, fix 2, c2, c3) = 4 each.
- 07 = fix 1 + c2 + QA-Red re-scope after integration (upstream change invalidated one red file) = 3. The second integrate and its re-verify left no commit and are excluded.
- 14 = fix 1 + c2 + (QA-Verify c2 FAIL on one doc item) c3 + re-verify c3 = 4.
- 15 = 0 judged: the `QA-Red fix 1 (Spec-Gap)` dispatch changed nothing (like 002-07's no-change fix), and the Developer's blocker is a defect in STORY-003-05's price handling (fixed later by BUG-002), so no redo of 15's own work has happened yet. If the Spec-Gap QA-Red dispatch is counted as a round, judged becomes 1 (total 32).
- 01: the Developer c1 re-run is a relaunch of the workflow (r1 BLOCKED when the red-fix commit step failed), so part of it is an infrastructure replay; judged keeps 2 because the red test defect (fix 1) and the Developer redo against corrected tests are both real work. If one treats the relaunch as pure replay, 01 judged = 1 (total 30).

Dispatch totals SPRINT-03 (to cutoff 2026-11-14T09:40:00Z):
- Item-attributed: 189 (QA-Red 32, Dev Build 32, Dev Integrate 13, QA-Verify 17, gp helpers 79, devops merge 16).
- Sprint-level in window: 36 (see section 5).
- Unattributed (not obviously sprint-level, no item ID): 0.
- Window total = 189 + 36 = 225 (12 + 181 + 13 workflow agents, plus 19 top-level).
- Pre-window: 8 (see section 5).

## 5. Sprint-level, unattributed and pre-window dispatches

Sprint-level (36), all in window, none counted to an item:
- 16 SDR readers, `architect-reader`: `SDR reader STORY-003-01..15` and `SDR reader BUG-001`, 19:56:14Z-19:56:58Z (named items but design-review fan-out).
- 1 SDR synth, `architect-synth`: `SDR synth for Sprint 3`, 20:01:17Z.
- 8 milestone plans, `architect`, workflow dispatches: `M1 plan` 20:40Z (wf r1), `M2 plan` 21:30Z, `M3 plan` 23:32Z, `M4 plan` 00:35Z, `M5 plan` 00:49Z, `M6 plan` 02:29Z, `M7 plan` 02:56Z (r2), `M8 plan` 08:21Z (r3). M1 was planned once (r2 got `planned0: [M1]`).
- 9 contract dispatches: `cut C1` (general-purpose, 21:30Z), `cut C2` (22:53Z), `cut C3` (23:31Z), `C4 prepare` (general-purpose), `C4 skeleton` (`developer`), `C4 cut` (general-purpose) (00:07Z-00:09Z), `cut C6` (00:35Z), `cut C5` (00:49Z), `cut C7` (01:53Z).
- 2 wiki checks: `Duplicate check for BUG-002` (`cleargate-wiki-query`, 04:50Z) and `Contradiction check BUG-002` (`cleargate-wiki-contradict`, 04:53Z). They name an item but are sprint-level per 2.3.
- No reporter, code-simplifier or QA consolidation dispatch exists yet (sprint still Active).

Unattributed (not obviously sprint-level): none. For a script that attributes by item ID alone, 18 dispatches have no item ID (8 M plans, SDR synth, 9 contract dispatches); the other 18 sprint-level ones carry an ID in the description. SPRINT-01's recount listed only its 3 contract cuts as "unattributed by description" while treating plans/synth as sprint-level; applied that way here the figure would be 9 (all contract dispatches).

Token share (dedup by `message.id` once per transcript; transcripts are not cross-deduplicated, since each dispatch is its own transcript):

| bucket | dispatches | output only | in + out + cache creation | all-in (incl. cache reads) |
|---|---|---|---|---|
| all in-window | 225 | 3,609,113 | 21,660,455 | 457,546,433 |
| item-attributed | 189 | 2,167,000 | 15,789,344 | 270,005,002 |
| sprint-level (36) | 36 | 1,442,113 (40.0%) | 5,871,111 (27.1%) | 187,541,431 (41.0%) |
| no item ID (18: plans, synth, contracts) | 18 | 1,329,057 (36.8%) | 5,181,679 (23.9%) | 186,072,296 (40.7%) |
| contracts only (9) | 9 | n/a | n/a | 1,118,492 (0.24%) |
| 8 M plans only | 8 | n/a | n/a | about 181.9M (39.7%) |

Raw sums: input 6,550, output 3,609,113, cache creation 18,044,792, cache read 435,885,978. The large "all-in" shares are the milestone architect plans (590-962 transcript lines each, heavy cache reads). Unattributed share by the strict rule (not obviously sprint-level, no ID) = 0 dispatches, 0 tokens. The workflow summary jsons report far lower `totalTokens` (r1 1,053,733 and r2 14,624,116) than my all-in sums (27.95M and 401.9M), so they use a different token definition (closer to input + output + some cache); my in+out+cache-creation figures are the nearest comparable.

Pre-window (8, first timestamp before 2026-11-13T19:54:54.619Z, after SPRINT-02 closed at 18:56Z): 19:07Z `Split STORY-003-02 into 02 and 03`, `Split STORY-003-12 into 12 and 13`, `Consistency pass on Sprint 3 stories` (general-purpose); 19:15Z four `Contradiction checks` (01-04, 05-08, 09-12, 13-15 plus sprint; `cleargate-wiki-contradict`); 19:54:31Z `DevOps reachability check` (23 s before the first event, strictly pre-window, same as SPRINT-01's preflight). Earlier SPRINT-03 planning dispatches (Sprint 3 epic prior-work check, EPIC-003 and CR-001 contradiction checks, four `Draft stories` forks at 18:45Z) were already counted as SPRINT-02 unattributed work in recount.md.

## 6. Disagreements (dispatch rework vs git vs counters)

1. All 17 items: state.json counters are 0 everywhere, while judged rework is 31 rounds and git rework is 28. Matches the SPRINT-01/02 pattern: red corrections and Developer re-dispatches are invisible to `qa_bounces` / `arch_bounces`.
2. STORY-003-14: the one genuine QA bounce (QA-Verify c2 returned FAIL on one doc item, Developer c3, QA-Verify c3 PASS) is recorded as `qa_bounces: 1` in the `wf_0bb7f331` result `counters`, but state.json still says 0. events.jsonl has no bounce event for it either. Dispatch literal 5, judged 4, git 3.
3. STORY-003-02 and 003-13: dispatch literal 5, judged 4, git 3. Two fix cycles (QA-Red fix 1 and 2, Developer c2 and c3, QA-Verify once). Git sees 2 qa-red corrections plus the one `(rework)` feat; the Developer c2 left no commit (only c3 committed).
4. STORY-003-03/04/05/06/10: dispatch literal 3 (two of those rounds are QA-Red fix plus Developer c2; for 03/04/05/06 the third is the planned Integrate), judged 2, git 2. For 10 the literal 3 includes an Integrate dispatch that produced no integrate commit. 11: literal 2, judged 2, git 2 (no integrate dispatch).
5. STORY-003-07: dispatch literal 5 (fix 1, re-scope, Developer c2, integrate x2), judged 3, git 3 (fix 1, re-scope, and `cca5f8c (rework)`, which is an empty marker commit). The second Integrate produced no commit.
6. STORY-003-05: git build is the C4 skeleton commit `b20e379`, not the story's own build (which is the `(rework)`-tagged `ee32430`); the mechanical split is build 1 / rework 1 either way.
7. STORY-003-01: the Developer c1 appears twice (r1 21:17Z and r2 21:24Z) because r1 stopped when the red-fix commit step failed ("BLOCKED"), and r2 relaunched with `skipPrepare` and the corrected red SHA. Literal 2, judged 2, git 2 (`b37b4a1`, `cacf56f`, `76f29ec (rework)`).
8. STORY-003-08/09/12 (no red correction) and BUG-001: git rework 0. 08 and 12 have literal 1 only from the planned Integrate; 09 and BUG-001 literal 0.
9. STORY-003-15: literal 2 (QA-Red `fix 1 (Spec-Gap)` that changed nothing, plus the planned Integrate), judged 0, git 0 (no red correction commit; the only feat is the build and the integrate commit is a sprint-branch merge). Counters 0, state Bouncing (blocked on a STORY-003-05 defect, BUG-002 was added to fix it).
10. BUG-002: literal 2, judged 2, git 2 (qa-red fix 1 plus the `(rework)` fix). Not in the original 16; its events start at 05:20Z (added to the roster mid-sprint).
11. `wf_0bb7f331` log says "STORY-003-12 GREEN at PLACEHOLDER", a runner placeholder SHA rather than a commit; the real merge commits are `d51d63e` (integrate) and `45d5c16` (merge).

## 7. Special cases

- Workflow r1 `wf_01856b8c`: 12 agents, ended early (BLOCKED at 21:22Z); its summary marks the other 14 items BLOCKED with no dispatches. The `003-01 developer c1` description appears twice (r1 and r2). It is the only duplicate description in the window.
- Workflow r2 `wf_0bb7f331`: 181 agents on disk, 181 in its summary (no under-reporting this time, unlike SPRINT-02's 46 vs 61). Its first dispatch is 21:24Z (003-01 developer c1); it ran to 04:46Z and returned 003-15 as BLOCKED.
- Workflow r3 `wf_650c9f1f`: no summary json under `workflows/`; 13 agents (M8 plan, 11 BUG-002 dispatches, and `003-15 integrate`). The 003-15 integrate is a `developer` dispatch that starts 09:27:47Z (inside the cutoff) and its transcript ends 09:39:43Z on an assistant message, so it may be mid-flight at the cutoff. It made `f717aab` (09:27:54Z).
- No interrupted, hook-cancelled, 403 or API-error markers were found in any in-window transcript (grepped for `Request interrupted`, `hook_cancelled`, `status":403`, `rate_limit`, `overloaded_error`, `isApiErrorMessage`: zero hits). So there are no user-interrupted dispatches and no helper retries, unlike SPRINT-02.
- Retries/resumes: only 003-01 (r1 to r2, above). The `commit red fix 1` helper in r1 for 003-01 reported a failure although its commit was created (the runner treated it as blocked), which forced the relaunch.
- Meta-only duplicates: the three `Split 06, renumber, align stories` metas (sessions `429f7cd4`, `5549e7e9`, `1dc940ec`, toolUseId suffix `oiNhbn`, `revivedAt` set) are still on disk without transcripts and without timestamps; they are pre-sprint SPRINT-01 drafting duplicates and are excluded here. A scanner reading every meta file would see them with no first timestamp.
- Mid-sprint addition: BUG-002 is on the roster with no pre-sprint `Ready to Bounce` genesis event (its first event is 05:20Z, actor `orchestrator`). Its drafting checks (04:50Z, 04:53Z) are before its first event.
- 003-04, 003-08, 003-05, 003-06 ran in parallel after C4 (00:08Z-00:10Z); some `Dev Integrate` dispatches ran against a moved sprint branch. Only 003-07 needed a second integrate (`integrate r2` after a QA-Red re-scope).
- Dev c2 that only committed (no code change): 07 (empty marker commit `cca5f8c`), 14 (c2 committed the c1 implementation unchanged), 13 (c3 "earlier uncommitted implementation passes unchanged"). These count as literal and judged rework per the SPRINT-01/02 convention.
- The `Request interrupted`-style ends on transcripts are absent; transcripts end on `attachment` lines (workflow runner hand-off), not on user interrupts.

## 8. Totals line

Items 17 (15 stories + 2 bugs) | literal rework 45 | judged rework 31 | git rework 28 (mechanical) / 28 (judged) | unattributed dispatches 0 under rule 2.3 (18 have no item ID: 8 M plans, SDR synth, 9 contract dispatches; 9 if only contract dispatches are counted as in SPRINT-01) | unattributed share 0% by the strict rule; 40.7% of all-in tokens (23.9% of input+output+cache-creation, 36.8% of output) for the 18 no-ID dispatches, 41.0% / 27.1% / 40.0% for all 36 sprint-level dispatches.
