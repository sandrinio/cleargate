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

## Re-sync — 2026-09-25T03:47:20Z

`node sprint-runs/SPRINT-41/b0-live-resync.mjs --apply` from the main checkout on `sprint/S-41`
(BUG-089 merged: outer ebd70b09 + a568864b; `dist` rebuilt from cli main a2694e4).
- Backup: `b0/claude-live-backup-2026-09-25T03-47-20-444Z.tgz` plus a per-file sha256 manifest (local only).
- Six live files rewritten: `agents/reporter.md`, `hooks/pending-task-sentinel.sh`, `hooks/pre-edit-gate.sh`,
  `hooks/pre-tool-use-task.sh`, `hooks/token-ledger.sh`, `settings.json`.
- Version pin kept at the live `0.20.0` (substituted for `__CLEARGATE_VERSION__`); the four remaining
  `diff -rq` entries are pin-only. Post-condition: live == canonical (pin-substituted) for every canonical file.
- Live-only files untouched: `scheduled_tasks.lock`, `settings.local.json`, `worktrees/`. No orphans.

Live hashes after re-sync (sha256):

| File | sha256 |
|---|---|
| `settings.json` | `c36adcfd0aaa353dd489…` |
| `hooks/pre-edit-gate.sh` | `cb06ccc2ab863f52eee1…` |
| `hooks/pending-task-sentinel.sh` | `e373fea7ef12bb653a44…` |
| `hooks/pre-tool-use-task.sh` | `d0e5fb16cc83f96cc7dd…` |
| `hooks/token-ledger.sh` | `ec83cebc66d73b841b54…` |

## After re-sync — 2026-09-25T03:47:27Z (fresh sessions)

| Case | Result | Evidence |
|---|---|---|
| E1 negative | **PASS** — refused, `src/uncovered.ts` absent | tool_result `is_error: true`: `PreToolUse:Write hook error: [${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --host claude]: ClearGate: planning-first gate — no approved story covers …/src/uncovered.ts (no_approved_stories)` |
| E2 positive | **PASS** — permitted, `src/allowed.ts` present | default warn mode |
| D1 negative | **PASS** — refused, no subagent ran, no ledger row | `PreToolUse:Agent hook error: [… pending-task-sentinel.sh --host claude]: FLASHCARD GATE BLOCKED: 1 unprocessed flashcard(s) …` |
| D2 positive + identity | **PASS** — permitted after `touch .processed-<hash>` | ledger row `agent_type: "qa"`, `sentinel_started_at: 2026-09-25T03:48:13Z` (before: `architect`, empty sentinel) |

Evidence directory: `b0/proof-20260925T034727Z/`.

## Scope notes

- **BUG-089 Task 6 is satisfied** by this proof: a new Claude session refuses an uncovered enforce-mode
  edit and a pending-flashcard dispatch, with positive controls, and the live hashes are recorded.
- **The orchestrating session is not a fresh session.** Claude Code snapshots hook configuration at
  session start, so the session that ran this sprint up to B0 keeps its pre-B0 hook registration
  (matcher `Task`) until it restarts; its own ledger rows before a restart stay unattributable. The
  Reporter should treat SPRINT-41 ledger rows before a restart as unattributed. A human restart of Claude Code
  brings the orchestrator onto the re-synced registration.
- **BUG-085 stays open:** this is its M0 step only. Its durable drift detection is wave11 (M3).
