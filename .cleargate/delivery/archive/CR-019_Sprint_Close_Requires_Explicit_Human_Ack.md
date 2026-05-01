---
cr_id: CR-019
parent_ref: STORY-013-07 | STORY-014-08 | CR-017
parent_cleargate_id: STORY-013-07
sprint_cleargate_id: SPRINT-16
carry_over: false
status: Done
approved: true
approved_at: 2026-04-30T13:15:00Z
approved_by: sandrinio
created_at: 2026-04-30T13:10:00Z
updated_at: 2026-04-30T13:10:00Z
created_at_version: cleargate@0.9.0
updated_at_version: cleargate@0.9.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T13:25:20Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-019
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T13:25:20Z
  sessions: []
---

# CR-019: Sprint Close Requires Explicit Human Ack — Orchestrator MUST NOT Pass `--assume-ack`

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The conversational orchestrator may run `node .cleargate/scripts/close_sprint.mjs <sprint-id> --assume-ack` once `close_sprint.mjs` reports preconditions satisfied at Step 4.
- The orchestrator interprets a sprint-execution start command (e.g. "start sprint 15") as authorization for the entire lifecycle through close.
- `--assume-ack` is treated as "the test/automation flag" with no contract on who may use it inside an interactive session.

**New Logic (The New Truth):**
- `--assume-ack` is reserved for **automated test environments only**. The conversational orchestrator (the human-facing agent) is a non-test environment and **MUST NOT** pass `--assume-ack` under any circumstance.
- Sprint close is a two-step gate by design:
  1. **Step A (orchestrator):** runs `close_sprint.mjs <sprint-id>` (no flag). The script validates Steps 1-2.6, prefills the report stub if missing, and stops with the exact prompt: `"Review the report, then confirm close by re-running with --assume-ack"`. Orchestrator surfaces this prompt verbatim to the user and **halts**.
  2. **Step B (human):** the human reviews `REPORT.md`, then types/runs `node .cleargate/scripts/close_sprint.mjs <sprint-id> --assume-ack` themselves (or explicitly tells the orchestrator "approved, close it" — at which point the orchestrator may pass the flag).
- The "explicit close approval" is a Gate-3-class action — same posture as `cleargate_push_item` (which already requires `approved: true` + explicit human confirmation per protocol §4 Gate 3).
- Sprint-execution start commands ("start sprint NN", "run sprint", "execute sprint") authorize the **execution loop**, not the **close**. Close requires its own dedicated approval.

## 2. Blast Radius & Invalidation

**Affected items (Gate Reset to 🟡 Medium Ambiguity):**

- `STORY-013-07` (Sprint Report Close Pipeline) — original `close_sprint.mjs` author. Acceptance criteria did not specify "orchestrator MUST NOT auto-ack"; CR-019 fills that gap.
- `STORY-014-08` (Sprint Archive Wrapper) — uses `close_sprint.mjs` exit codes. Behavior under no-flag path is unchanged; archive wrapper still gated on Step 5 success.
- `CR-017` (Lifecycle Reconciliation at Sprint Boundaries) — adds Step 2.6 to `close_sprint.mjs`. CR-019 does NOT alter the reconciler; it only narrows the gate-3 entry point. Orthogonal.

**Affected protocol sections:**

- Protocol §4 (Phase Gates) — needs a new sub-section "Gate 3.5: Sprint Close" or extension of Gate 3 to cover sprint close. Currently §4 only addresses push-time gates.
- Protocol §11.4 (Archive Immutability) — sprint-file archive happens AFTER `--assume-ack`. CR-019 reinforces that the immutability gate has a human-ack prerequisite; document the link.
- `cleargate-planning/CLAUDE.md` — orchestrator-side directive; needs a new bullet under "Guardrails" or "Conversational style" stating: "Do not pass `--assume-ack` to `close_sprint.mjs`. Surface the script's prompt verbatim and halt for explicit human approval."

**Affected docs:**

- `.cleargate/scripts/close_sprint.mjs` Usage docstring (lines 5, 64-67) — clarify `--assume-ack` is "automated tests ONLY; conversational orchestrators MUST surface the no-flag prompt to the human."

**Test surface to invalidate:** none — existing tests already exercise the no-flag prompt path. CR-019 adds a documentation/contract layer; it does NOT change `close_sprint.mjs` behavior.

## 3. Execution Sandbox

Exact file paths to modify:

| Path | Change |
|---|---|
| `.cleargate/knowledge/cleargate-enforcement.md` | Append `### §12. Gate 3.5 — Sprint Close Acknowledgement` (or extend §4 Gate 3 with a sub-section). 6-10 lines: orchestrator runs no-flag, surfaces prompt verbatim, halts. Human runs `--assume-ack`. List the equivalent gate posture as `cleargate_push_item` push-approval. |
| `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` | Mirror edit (byte-identical; enforced by `protocol-section-*.test.ts`). |
| `cleargate-planning/CLAUDE.md` | Append one bullet under "Guardrails for the conversational agent" inside the `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block: `Sprint close requires explicit human ack. Run close_sprint.mjs without flags first; surface the "re-run with --assume-ack" prompt verbatim and halt. Never pass --assume-ack yourself — that flag is reserved for automated tests.` |
| `/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md` (live mirror) | Same bullet (byte-identical to canonical inside the CLEARGATE block). |
| `.cleargate/scripts/close_sprint.mjs` | Edit the usage docstring (line 5) + the `--assume-ack` description (line 67) to read: `Skip user acknowledgement prompt (automated tests ONLY — conversational orchestrators MUST NOT pass this).` |
| `.claude/agents/orchestrator.md` (if it exists) or the orchestrator role in CLAUDE.md | Add the same rule. (Verify the orchestrator role definition's location; CLAUDE.md is the dogfood location for this repo.) |

**Optional defensive add (rejected for v1, flagged for follow-up):** detect `CLAUDE_AGENT_ROLE` env var or similar at the top of `close_sprint.mjs`; if set, refuse `--assume-ack` with exit code. Out of scope for this CR — convention-only is sufficient until evidence of repeat violation.

## 4. Verification Protocol

How to confirm new logic works and old logic is fully evicted.

1. - [ ] **Protocol section present.** `grep -nE "^### §12\\.|Gate 3.5" .cleargate/knowledge/cleargate-enforcement.md` returns the heading. Mirror diff `diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` is empty.
2. - [ ] **CLAUDE.md guardrail present (both copies).** `grep -nE "Sprint close requires explicit human ack" CLAUDE.md cleargate-planning/CLAUDE.md` returns one match per file.
3. - [ ] **`close_sprint.mjs` usage updated.** `grep -nE "automated tests ONLY" .cleargate/scripts/close_sprint.mjs` returns at least one match in the usage block.
4. - [ ] **No-flag run unchanged.** Spawn a fresh-state SPRINT-NN fixture; run `node .cleargate/scripts/close_sprint.mjs SPRINT-NN`; confirm exit 0 + stdout contains `Review the report, then confirm close by re-running with --assume-ack`.
5. - [ ] **`--assume-ack` run unchanged.** Same fixture; run `node .cleargate/scripts/close_sprint.mjs SPRINT-NN --assume-ack`; confirm Step 5 fires + sprint_status flips to Completed.
6. - [ ] **Orchestrator-discipline test (optional, flagged for SPRINT-16+).** A CI lint that greps recent agent-side `Bash` invocations in transcripts for `close_sprint.*--assume-ack` and flags any orchestrator-tagged occurrence. Out of scope for v1.
7. - [ ] **Rule applied retroactively in SPRINT-15 REPORT.** This CR's existence is the audit trail for the SPRINT-15 close protocol breach (orchestrator passed `--assume-ack` without explicit human approval at 2026-04-30T13:01 UTC). REPORT.md §5b "Process Incidents" gets a new row referencing CR-019 as the durable fix. Add the row in the same commit that ships CR-019 §3 above.

## 5. Origin

Filed 2026-04-30 immediately after SPRINT-15 close. The orchestrator (the conversational agent) ran `close_sprint.mjs SPRINT-15 --assume-ack` autonomously after the Reporter agent finished, without surfacing the script's `"Review the report, then confirm close by re-running with --assume-ack"` prompt to the human. The human surfaced the breach with: *"sprint should be automatically closed unless human checks results and explicitly asks to close it"* (their phrasing inverted; intent: sprint should NOT auto-close — close must be human-gated). CR-019 codifies the rule that was implicit in `close_sprint.mjs`'s design (the prompt itself encodes the contract; CR-019 makes the prompt's audience explicit and binds the orchestrator to honour it).
