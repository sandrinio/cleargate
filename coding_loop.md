# Coding loop: handoff for the next session

Written 2026-11-14 to continue a discussion with the owner in a new session. It covers where the
loop-improvement work stands, how the updated loop is meant to work, and the open questions about the
coding part of the loop.

## Where things stand

- **INITIATIVE-002 "Evidence-First Execution Loop"** is the loop improvement:
  `.cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md`. It has six
  workstreams (WS-1 evidence tiers, WS-2 process by risk, WS-3 sprint composition, WS-4 measurement,
  WS-5 generated facts, WS-6 per-stack support). The owner accepted all nine decisions in its §6.
  Their order: measurement and evidence first. EPIC-055 (parallel wave scheduling) is paused.
- **WS-4, first half, is done.** SPRINT-45 (EPIC-064) closed 2026-11-14: report rework and cost come
  from transcripts and git. cli main `f846d9a`, not published.
- **Field trial.** That release candidate is installed in dispenser_adapter (commit 58a6d1c) and its
  SPRINT-04 is running. The watch log and 64 findings are in
  `.cleargate/field-trials/2026-11-dispenser-sprint45-rc.md`. The watch is paused. Its tooling and
  read offsets are in `.cleargate/field-trials/watch/` (`chunk-011.txt` is not yet digested). Plan:
  one pass after SPRINT-04 closes, focused on the Reporter's §3 numbers.
- **Owner's triage call:** "improve the loop first, then fix issues". Each finding is mapped to the
  workstream that owns it (table at the end of the findings log). The rest wait for a cleanup sprint.
- **This repo still runs the pre-SPRINT-45 ClearGate.** The live `.claude/` and `.cleargate/` copies
  are 12 files behind, and `cleargate-cli/dist` is 40 commits behind main. Re-sync after dispenser
  SPRINT-04 closes (rebuild dist from cli main, then `node cleargate-cli/dist/cli.js init`), and
  before the next sprint here executes.
- **EPIC-065 "Proof decides done" (WS-1)** is drafted at
  `.cleargate/delivery/pending-sync/EPIC-065_proof_decides_done.md`. Its only failing readiness
  check is `interrogation-resolved`: ten §6 questions await the owner. Its contradiction check has
  **not run yet**. Run it before the Brief: `cleargate wiki contradict <file>` → the
  `cleargate-wiki-contradict` agent → `cleargate wiki contradict-commit <file>`. It absorbs CR-128
  and CR-129.

## The updated loop (whole sprint)

```
Plan ─► Shape items ─► Confirm ─► Build ─► Prove ─► Merge ─► Done ─► Walkthrough ─► Close
        (tier each)    (once)              (new)            (only with proof)   (proof table)
```

1. **Plan.** The sprint goal names how it will be proven and at what tier: `unit` (the repo's own
   tests), `container` (real dependencies, e.g. `make e2e` on a real Postgres), `live` (a real
   service or session the agents can reach), or `human` (the owner checks). If agents cannot reach
   the tier, the plan says so.
2. **Shape items.** Every story, CR and bug has `proof_tier` and a short `## Proof` section (command
   or steps, expected result). Container and live items mark at least one Gherkin scenario
   `@holdout`.
3. **Confirm.** The owner approves goal, proofs and item list once. Preflight refuses an item with no
   tier. Kickoff runs the tests on the sprint base and records the failing set (`baseline.json`).
4. **Build.** The coding part, below.
5. **Prove (new).** For unit and container items, a script (`record_evidence.mjs`, not an agent)
   runs the proof and writes `evidence/<ID>.json`: what ran, the exit code, the last 40 output
   lines, and the commit sha. QA-Verify writes and runs the holdout scenarios here.
6. **Merge.** Unchanged, serial.
7. **Done only with proof.** A merged item waits in the existing `Sprint Review` state until its
   evidence exists. `update_state.mjs` refuses Done without it.
8. **Walkthrough.** Human-tier items are proven by the owner's confirmation, recorded as evidence.
   A browser check runs first where a repo has a browser harness (none of ClearGate's repos does).
9. **Close.** The report has a per-item proof table, or "built, not proven at tier X", which the
   owner must acknowledge. The goal verdict is recorded in the report (CR-129, reversing OD-4).

## The coding part today (per story)

```
Architect plan ─► QA-Red ─► wiring check ─► Developer ─► QA-Verify ─► Architect review ─► merge
 (per milestone)  (tests     (TPV)          (code)        (re-check)   (post-flight)        (DevOps)
                   first)                        ▲              │
                                                 └── bounce ────┘  up to 3, then escalated
```

- **Architect plan** (Opus): one plan per milestone. Every story in the milestone waits for it.
- **QA-Red** (Sonnet): writes failing tests from the acceptance scenarios. It sees only the story
  file, and its tests are sealed.
- **Wiring check (TPV):** confirms the red tests fail for the right reason.
- **Developer** (Sonnet): codes in its own worktree until the sealed tests pass, then commits.
- **QA-Verify** (Sonnet): a fresh agent re-checks the work against the scenarios. PASS, FAIL
  (bounce) or PASS-PENDING-SMOKE.
- **Architect review:** standard lane only.
- **Merge:** DevOps, serial.
- Spec: `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` §C.
  Agents: `.../agents/{architect,qa,developer,devops}.md`. Wave mechanics: `launch_wave.mjs`, §C.0.

## What the evidence says about the coding part

| Where | Problem | Evidence |
|---|---|---|
| Red tests | Top source of bounces: the tests themselves are wrong, often pinning exact shapes | Most early Architect bounces were test defects; 11 of 15 Kurnera reports |
| Red tests | Very large | dispenser story 004-01: 1,347 lines of red tests; QA-Red is the most expensive agent in a wave |
| Architect plan | Slow, and blocks the whole milestone | dispenser M1: 24 min against a 10-min budget, a 60 KB plan |
| Mechanical steps | Agents doing script work | "TPV scan" and "commit red" ran as general-purpose agents, 6 per wave |
| Checks | Tests don't run in Go | `pre_gate_runner.sh` skips configured commands without `package.json`; 86 of 86 dispenser scans skipped |
| QA-Verify | Green is not working | Walkthroughs and live runs find 3–4× more defects than QA bounces |
| Process size | Everything takes the full pipeline | Bugs bounce less (14% vs 23%) but take the same path; the fast lane was used once in 77 items |
| Checking | The same model writes and checks | doc_processor and mediafi switched to a different checking model on their own |

## Decided for the coding part

- Red tests assert properties, not exact shapes (INITIATIVE-002, owner decision). EPIC-065 adds the
  QA-Red rule.
- Holdout scenarios for container and live items: QA-Red and the Developer never see them, and
  QA-Verify tests them after the build (EPIC-065).
- Configured checks run on any stack, and old failures are known before building (EPIC-065).
- QA-Red stays as a separate agent (INITIATIVE-002).
- Small items take a shorter path by risk signals (UI surface, subsystems crossed, scenario count).
  That is WS-2, later.

## Open questions about the coding part (to discuss)

Each has a recommendation; none is decided.

1. **Architect plan.** (a) A short per-story plan written in parallel, capped at about 150 lines;
   (b) plan only risky stories; (c) keep the per-milestone plan with a size cap.
   *Recommended: (a), plus (b) for small items, so a story starts when its own plan is ready.*
2. **QA-Red volume.** *Recommended: cap at one test per acceptance scenario, asserting behaviour,
   plus edge cases only where the story names them.*
3. **Mechanical steps become scripts.** The wiring check, committing the red tests and worktree
   prep. *Recommended: yes.*
4. **A different model checks.** The Developer and QA-Verify are both Sonnet today.
   *Recommended: QA-Verify, including the holdout tests, runs on a different model than the
   Developer, at least for container and live items.*
5. **Bounce routing.** *Recommended: QA-Verify's verdict states whether the defect is in the code or
   in the red test. The bounce goes to the Developer or to QA-Red accordingly, and the report counts
   the two separately.*

Placement: 2 and 5 are about trustworthy tests and fit EPIC-065. 1, 3 and 4 change how the build
runs, which suggests a separate epic ("the build step, sized by risk") paired with WS-2. The owner
was asked whether to fold 2 and 5 into EPIC-065 and which of the five to take. **No answer yet.**

## EPIC-065's ten open questions (summary)

Every one has a recommendation in the epic's §6:
1. the four tiers
2. `proof_tier` plus a `## Proof` section (supersedes CR-128)
3. Done waits in `Sprint Review` until evidence exists
4. the script runs command-tier proofs
5. at least one `@holdout` per container or live item
6. the predicate applies to new items only, while preflight requires a tier for every sprint item
7. absorb CR-129 and reverse OD-4
8. don't block on EPIC-056
9. keep the two field-trial fixes (stack-neutral pre-gate, kickoff baseline) in this epic
10. eight stories in one sprint

## Next steps

1. Owner answers the five coding questions and decides where 2 and 5 go.
2. Fold the answers into EPIC-065, or draft the build-step epic.
3. Run EPIC-065's contradiction check, then render its Brief. Owner answers §6; approve.
4. Decompose into stories, run the duplicate check per CLAUDE.md, and draft the SPRINT-46 plan.
5. Before SPRINT-46 executes: dispenser SPRINT-04 closes; run the post-hoc watch pass (the Reporter's
   §3 numbers); re-sync this repo's live copy.
