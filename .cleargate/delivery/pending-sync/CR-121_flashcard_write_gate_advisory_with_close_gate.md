---
cr_id: CR-121
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
approved: false
context_source: "2026-09-06 audit: live settings.json:15 matcher is 'Task' while the host's dispatch tool is 'Agent' (215 Agent vs 0 Task tool_use across 15 transcripts); .processed-* markers 33 → 19 → 0 → 0 → 0 for SPRINT-35/38/39/40/41"
area: sprint-execution,flashcard,hooks,close-pipeline
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:39:28Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-121
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:39:28Z
  sessions: []
---

# CR-121: Flashcard Write-Gate Becomes Advisory Per-Spawn, Blocking Once at Close

## 0.5 Open Questions

- **Question:** Is making the per-spawn gate advisory a net loss of enforcement?
- **Recommended:** Not if both halves ship together. The advisory flip alone genuinely removes enforcement with nothing behind it — the barrier was written because cards were being lost. Pairing it with a blocking pre-close check moves the hard gate from ~100 per-spawn interruptions to one Gate-4 check, which is strictly stronger than today's *zero* (the gate has been mechanically dead for three sprints).
- **Human decision:** {populated during Brief review}

- **Question:** Should this land before, with, or after [[BUG-085]]?
- **Recommended:** With or before. This is a sequencing constraint, not an optimisation — see §1.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The belief that the flashcard write-gate is currently running. It is not. Live `.claude/settings.json:15` matches `"Task"`; canonical already carries BUG-068's `"Task|Agent"`. The host's dispatch tool is `Agent` — 215 `Agent` vs 0 `Task` tool_use across 15 transcripts — so the live matcher never fires. `.cleargate/hook-log/pending-task-sentinel.log` is 0 bytes, and `.processed-*` marker counts run 33 (SPRINT-35), 19 (SPRINT-38), then **0 / 0 / 0** for SPRINT-39, SPRINT-40 and SPRINT-41.
- `SKILL.md:560`'s description of the cadence: "after every story merge — before creating story N+1's worktree". It is a PreToolUse guard, so it actually interposes on **every agent spawn** (5–6× per story) and never on worktree creation, which is a Bash call and ungated.

**New Logic (The New Truth):**

- The per-spawn gate defaults to the **advisory** branch that already exists at `pending-task-sentinel.sh:130-139`. That branch prints every unprocessed card plus the exact `touch .../.processed-<hash>` line, so the orchestrator still sees the full list — it simply is not interrupted 5–6× per story.
- Hard-blocking moves behind an opt-in env var. The blocking branch is **not deleted** (see §3).
- `close_sprint.mjs` gains an unprocessed-cards check in its **BLOCKING** pre-close block, alongside Steps 2.7/2.8. Today it has only a post-close, non-blocking FLASHCARD cleanup scan at Step 6.7.
- `SKILL.md:560`'s cadence sentence is corrected to describe what the hook actually does.

**Why this is time-boxed.** [[BUG-085]] is sitting in `pending-sync` reading as pure hygiene — it is the re-sync that flips the live matcher to `Task|Agent` and turns this barrier back **on**. Replaying the gate's scan loop against SPRINT-39's 36 reports takes 1.42–1.87 s per spawn and reports **20 unprocessed cards**: if BUG-085 lands first, the next sprint opens with a per-spawn hard block against a 20-card backlog, at O(reports) per spawn — O(n²) across a sprint. Either land this with BUG-085, or add the sequencing note to BUG-085 itself.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none.
- [ ] Invalidate/Update Epic: none.
- [ ] Database schema impacts? No.

Coupled item: [[BUG-085]] — must not merge before this without the sequencing note.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/hooks/pending-task-sentinel.sh:130-139` — the advisory branch, already written, already printing the card list and the exact `touch` remediation line.
- **Coverage of this requirement:** ~80% — the behaviour exists in full; only the default selection changes.
- **Surface:** `.cleargate/scripts/close_sprint.mjs` Step 6.7 — an existing post-close, non-blocking FLASHCARD cleanup scan.
- **Coverage of this requirement:** partial — right script, right data, wrong phase (post-close and non-blocking). Steps 2.7/2.8 are the blocking pre-close block this check joins.
- **Surface:** `.claude/settings.json:15` — the `Task` matcher that makes the whole thing inert today.
- **Coverage of this requirement:** none — that is BUG-085's fix, not this CR's.

## Prior work

- [[BUG-085]] — Draft, "Canonical `.claude/` fixes never reach the live instance, and nothing detects it". Direct sequencing coupling; the reason this CR is time-boxed rather than optional.
- [[BUG-068]] — Completed. Fixed the `Task|Agent` matcher in canonical; the live tree never received it, which is what BUG-085 covers.
- [[CR-043]] — Red/Green TDD discipline; owns the sealed-red-test convention that constrains how this CR may change the hook (see §3).

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` and live — flip the default to the advisory branch, put hard-block behind an opt-in env var
- `.cleargate/scripts/close_sprint.mjs` and canonical — add the unprocessed-cards check to the BLOCKING pre-close block
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:560` and live — correct the cadence description

**Do NOT modify or delete:**
- The blocking branch itself. `.cleargate/scripts/test/test_flashcard_fail_closed.red.sh` is marked IMMUTABLE and pins scenarios S1/S4 to exit 1 + `FLASHCARD GATE BLOCKED` against the canonical hook. This must be an **opt-out default**, not a removal — otherwise that sealed red test needs a logged `SKIP_RED_GATE=1`, which CR-087 constrains.
- The six strings `cleargate-cli/test/scripts/wave-execution-barrier.red.node.test.ts` pins in SKILL.md — `launch_wave`, `SKIP_FLASHCARD_GATE`, `resumeFromRunId`, `idempotent`, `between-wave` (single-sourced at `:281`) and `.processed-`. That file is default-tier and the pre-commit ratchet runs at `knownFailures=0`.
- `SKIP_FLASHCARD_GATE` ownership. It belongs to `launch_wave.mjs`'s try/finally per BUG-034; do not reintroduce an orchestrator-owned obligation.

## Task Breakdown

- [ ] Flip `pending-task-sentinel.sh`'s default to the advisory branch at `:130-139`
- [ ] Put hard-block behind an opt-in env var, leaving the blocking branch intact
- [ ] Add the unprocessed-cards check to `close_sprint.mjs`'s BLOCKING pre-close block beside Steps 2.7/2.8
- [ ] Correct `SKILL.md:560`'s cadence sentence (PreToolUse on every spawn, not per-merge)
- [ ] Verify `test_flashcard_fail_closed.red.sh` S1/S4 still pass under the opt-in env var
- [ ] Verify the six pinned SKILL.md strings survive
- [ ] Mirror canonical → live for the hook and SKILL.md

## 4. Verification Protocol

**Command/Test:** `bash .cleargate/scripts/test/cr121_flashcard_advisory_default.red.sh` plus the existing `bash .cleargate/scripts/test/test_flashcard_fail_closed.red.sh`

Asserts: default spawn with unprocessed cards → advisory output, exit 0, card list and `touch` line present; same with the opt-in env var → exit 1 and `FLASHCARD GATE BLOCKED` (the sealed test's S1/S4 behaviour, preserved); `close_sprint.mjs` pre-close with unprocessed cards → blocks; with none → proceeds.

**Test layers.** Declare all three below.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Bash hook and a close-path check; both covered by harnesses, no unit seam worth adding |
| Integration tests | 0 | No Postgres/Redis surface involved |
| E2E / acceptance tests | 4 | advisory default, opt-in block, close blocks on backlog, close proceeds when clean |

## Context Source

**context_source:** 2026-09-06 execution-efficiency audit. Verified: live `settings.json:15` matcher is `Task`; 215 `Agent` vs 0 `Task` tool_use across 15 transcripts; `pending-task-sentinel.log` is 0 bytes; `.processed-*` counts 33/19/0/0/0 for SPRINT-35/38/39/40/41; gate scan loop replayed against SPRINT-39's 36 reports at 1.42–1.87 s per spawn reporting 20 unprocessed cards.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. *(None impacted; the one coupled item, [[BUG-085]], is a sequencing constraint recorded in §1 and §2, not a downstream invalidation.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> The single unchecked box is the Gate-1 human decision, plus the two §0.5 questions — the second of which (ordering against BUG-085) is the one that actually matters.
