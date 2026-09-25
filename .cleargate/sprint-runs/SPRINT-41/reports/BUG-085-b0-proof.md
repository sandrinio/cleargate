# Barrier B0 — live `.claude/` re-sync proof (BUG-085 M0 step, BUG-089 Task 6)

role: orchestrator

Harness: `sprint-runs/SPRINT-41/b0-live-proof.sh` runs fresh headless Claude Code sessions
(`claude -p`, Claude Code 2.1.282, model claude-haiku-4-5-20251001) in throwaway fixture repos whose
`.claude/` is a copy of this repo's LIVE `.claude/`, with `cleargate-cli` symlinked so the hooks
resolve `cleargate-cli/dist/cli.js`. A fresh session reads settings.json at startup, which the
orchestrating session cannot (hooks are snapshotted at session start). The real sprint sentinel is
never altered. Raw evidence (stream-json transcripts, hook logs, fixture ledgers) is kept locally
under `sprint-runs/SPRINT-41/b0/` (not committed).

## Before re-sync — 2026-09-25T00:15:37Z (live hooks as shipped before B0)

| Case | Expectation after fix | Observed before | Meaning |
|---|---|---|---|
| E1 | enforce-mode uncovered Write refused | **Write landed** (`src/uncovered.ts` present). Hook log: `mode=enforce would_block … reason=no_approved_stories tool=Write` | BUG-089 reproduced in a real session: the gate decided to block and signalled it with exit 1, which Claude Code treats as non-blocking. |
| E2 | warn-mode Write permitted | permitted | positive control holds |
| D1 | Agent spawn refused while a flashcard is unprocessed | **not refused**; a subagent ran and wrote a ledger row | BUG-068/BUG-085: live matcher is `Task`, the host tool is `Agent`, so `pending-task-sentinel.sh` never fires. |
| D2 | ledger row attributes `agent_type: qa` | row attributes **`architect` / `STORY-033-03`** | BUG-069/BUG-085: no dispatch marker is written, so attribution falls back to a stale value. |

Evidence directory: `b0/proof-20260925T001537Z/`.
