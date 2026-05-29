# STORY-033-01 — Workflow Capability Spike — RESULT

**Executed:** 2026-05-29 (conversational session 42618b40). **Verdict: GO, with two architecture refinements.**
Method: 3 instrumented Workflow runs this session (2 design workflows + 1 dedicated 2-agent worktree-isolated probe `wf_b4e6fe33-256`) + 1 resume run, cross-referenced against `token-ledger.jsonl`, the hook logs, and the agents' own environment reports.

## The 6-answer checklist

| # | Question | Answer | Evidence |
|---|---|---|---|
| Q1 | Does `workflow()` `agent()` fire the hooks? | **Split: `SubagentStop` YES, `PreToolUse:Task` NO** | Rows written to `token-ledger.jsonl` on every workflow run; `pre-tool-use-task.log` never created across 3 runs / 18 agents. |
| Q2 | Under `isolation:'worktree'`, distinct `session_id`/transcript per agent? | **NO** | Probe's 3 new rows all carry `session_id=42618b40` (orchestrator) + `transcript=42618b40…jsonl` + identical `session_total` (out=379993); deltas garbage `104702/0/0`. Worktree FS is isolated; `SubagentStop` is not. |
| Q3 | N parallel thunks → N or 1 `SubagentStop`? | **Unreliable for attribution** | 3 rows for a 2-agent wave, all pointing at the orchestrator transcript → cannot be disaggregated per agent regardless of count. |
| Q4 | `resumeFromRunId` caches completed agents? | **YES** | Resume of the unchanged script: `subagent_tokens=0, tool_uses=0, duration=16ms`, identical result; ledger stayed at 87 rows (no agent ran). |
| Q5 | Per-thunk child env settable (`SKIP_FLASHCARD_GATE`, `DATABASE_URL`)? | **NO via the API; inherited from orchestrator** | Both probe agents reported both vars `UNSET` (orchestrator didn't set them). |
| Q6 | Do planning sprints actually have ≥2-way parallel waves? | **YES (qualitative)** | SPRINT-31 (next, planned) declares M1 = STORY-031-01 ‖ STORY-031-02, disjoint surfaces, both `parallel_eligible`. Recent sprints run 2–11 stories. Full mechanized census deferred. |

## Decisions this settles

1. **STORY-033-02 ledger-writer = BARRIER-from-`verdict.tokens`, keyed by RUN_ID.** The "per-agent transcript" branch is dead (Q2). `SubagentStop` cannot attribute per-agent under workflows, and the auto-marker never fires (Q1). The orchestrator must write one ledger row per segment at the barrier, from the tokens the segment returns in its verdict. RUN_ID re-keying of `.session-totals.json` is still needed so the barrier rows don't collide; the dead `pre-tool-use-task.sh` path is irrelevant under workflows (no longer block it).
2. **STORY-033-04 worktree model = ClearGate's own `.worktrees/STORY-X` via bash, NOT Workflow `isolation:'worktree'`.** The Workflow runtime's worktree (a) lives at `.claude/worktrees/wf_*` off the wrong base branch, and (b) contains **tracked files only** — gitignored `/.claude/` (live) and `/mcp/` are ABSENT. ClearGate segments must `git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN` themselves (as the serial loop does today) so story branches cut from `sprint/S-NN` and the barrier merge flow is preserved. Parallel segments get distinct `.worktrees/` paths (FS-isolated); the only shared touch is concurrent `git worktree add` on one repo — mitigate by pre-creating worktrees at wave launch.
3. **STORY-033-04 flashcard-gate bypass = ORCHESTRATOR sets `SKIP_FLASHCARD_GATE=1` before `launch_wave`, restores at the barrier.** Per-thunk env is not settable (Q5); one orchestrator-level env var is inherited by all workflow children. **Clarification (follow-up probe `wf_b45f8315-d0f`):** this is the WRITE-gate only. Flashcard *reading* is unaffected — a worktree-isolated agent read `.cleargate/FLASHCARD.md` fine (tracked, 224 lines) and the `Skill` tool IS available in workflow agents (skills resolve via the session registry, not the worktree). The only thing absent on disk is the gitignored live `.claude/skills/flashcard/SKILL.md`; the tracked canonical copy is present. So segments learn from flashcards normally.
4. **resumeFromRunId is a sound halt mechanism** (Q4): complete-then-resume re-runs only changed/new agents; completed GREEN segments are cached. Idempotent segments remain a belt-and-suspenders safety net.

## Net
The runtime supports the design. The two refinements (barrier-writer; ClearGate-managed worktrees not Workflow-managed) make EPIC-033 *simpler* in one place (no transcript-isolation fork to maintain) and more explicit in another (segments own their worktree lifecycle). No blocker found. Proceed to STORY-033-02/03/04.
