---
bug_id: BUG-009
parent_ref: EPIC-009
status: Approved
severity: P2-Medium
reporter: orchestrator
sprint: SPRINT-14
milestone: M2
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-26T11:44:00Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Long-standing observation surfaced again 2026-04-26 sprint kickoff. Multiple pending-sync
  items carry `stamp_error: "no ledger rows for work_item_id <ID>"` for IDs of shape PROP-NNN
  and CR-NNN. SPRINT-13 REPORT.md §Meta flagged this as "ledger attribution bug".
  ARCHITECT M2 §6 #1 CORRECTION (2026-04-26): the live `token-ledger.sh:121` regex already
  covers `STORY|PROPOSAL|EPIC|CR|BUG`. The narrower real defect is (a) `PROP` short-form is
  missing from the regex alternation, and (b) there is no `PROP-NNN ↔ PROPOSAL-NNN`
  normalization step, so an agent transcript saying `PROPOSAL=013` produces a ledger row
  keyed `PROPOSAL-013` while the file's `proposal_id: PROP-013` lookup never matches.
  M2 plan supersedes the original §3 / §4 sandbox prescription in this file. The Developer
  should fix the narrower defect (regex + bidirectional normalization), not the broader
  rewrite this file's earlier draft implied.
stamp_error: no ledger rows for work_item_id BUG-009
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T11:44:00Z
  sessions: []
---

# BUG-009: SubagentStop Token-Ledger Hook Does Not Record CR / PROPOSAL / BUG / EPIC Rows

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** The SubagentStop hook should record one token-ledger row per agent invocation, attributing the row to the work-item the agent was executing. The work-item-id is detected from the agent's first response line (per CLAUDE.md, Developer agents emit `STORY=NNN-NN` verbatim) or from a sprint-active sentinel + sprint markdown context. The detector must recognise all five work-item id shapes: `STORY-NNN-NN`, `CR-NNN`, `BUG-NNN`, `PROPOSAL-NNN` / `PROP-NNN`, `EPIC-NNN`.

**Actual Behavior:** The detector keys exclusively on the `STORY-NNN-NN` shape. When a sprint runs CRs as the unit of work (SPRINT-13 ran 4 CRs; SPRINT-14 runs 3 CRs in M1) or includes draft work for non-Story types (Proposal authoring, Epic decomposition, Bug repro), no rows land in the per-sprint ledger. Symptoms:

- Every CR / PROPOSAL / BUG / EPIC pending-sync file carries `stamp_error: no ledger rows for work_item_id <ID>` in frontmatter.
- SPRINT-13 REPORT.md §Meta: "Token ledger: MISSING — should be `.cleargate/sprint-runs/SPRINT-13/token-ledger.jsonl`; is in fact at `_off-sprint/` due to known SubagentStop attribution bug. 0 rows attributable to SPRINT-13."
- The Reporter is unable to compute per-CR or per-EPIC cost. The cost-per-trivial-CR calibration that motivated PROPOSAL-013 had to be inferred from anecdote, not the ledger.

## 2. Reproduction Protocol

1. From a sprint with at least one CR (e.g. SPRINT-13 archive or the live SPRINT-14):
   `cat .cleargate/sprint-runs/SPRINT-14/token-ledger.jsonl 2>/dev/null | head -5`
2. Observed: file does not exist OR exists but is empty / contains only STORY-NNN-NN rows; CR-NNN rows absent.
3. `cat .cleargate/sprint-runs/_off-sprint/token-ledger.jsonl 2>/dev/null | head -5` — this is where mis-attributed rows fall back to.
4. `grep "stamp_error" .cleargate/delivery/pending-sync/CR-*.md` → every CR carries the stamp_error string.
5. Read `cleargate-planning/.claude/hooks/token-ledger.sh` (or wherever the live SubagentStop hook lives — verify path before editing). Inspect the work-item-id detector regex; confirm it only matches `STORY-\d{3}-\d{2}`.

## 3. Evidence & Context

```
[from SPRINT-13 REPORT.md §Meta, 2026-04-25]
**Token ledger:** **MISSING** — should be `.cleargate/sprint-runs/SPRINT-13/token-ledger.jsonl`;
is in fact at `_off-sprint/` due to known SubagentStop attribution bug
(FLASHCARD 2026-04-19 `#reporting #hooks #ledger`). 0 rows attributable to SPRINT-13.
```

```
[2026-04-26 grep over pending-sync/]
PROPOSAL-012: stamp_error: no ledger rows for work_item_id PROP-012
PROPOSAL-013: stamp_error: no ledger rows for work_item_id PROP-013
CR-008:       stamp_error: no ledger rows for work_item_id CR-008
CR-009:       stamp_error: no ledger rows for work_item_id CR-009
CR-010:       stamp_error: no ledger rows for work_item_id CR-010
EPIC-021:     stamp_error: no ledger rows for work_item_id EPIC-021
… and 8 more
```

The flashcard at `2026-04-19 #reporting #hooks #ledger` documents this; the fix has not been prioritized until now.

## 4. Execution Sandbox

**Investigate / modify:**

- `cleargate-planning/.claude/hooks/token-ledger.sh` — the canonical SubagentStop hook (per sprint plan §2.2 corrected merge ordering, this is single-touch this sprint). Read first. Identify the work-item-id detector.
- The detector must recognise five id shapes when parsing the agent's first response line and the sprint-active context:
  - `STORY=NNN-NN` or `STORY-NNN-NN` (existing)
  - `CR=NNN` or `CR-NNN`
  - `BUG=NNN` or `BUG-NNN`
  - `EPIC=NNN` or `EPIC-NNN`
  - `PROPOSAL=NNN` / `PROP=NNN` / `PROPOSAL-NNN` / `PROP-NNN`
- Per-sprint ledger location: `.cleargate/sprint-runs/<SPRINT-ID>/token-ledger.jsonl`. Off-sprint (no `.active` sentinel) → `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl`.
- The `stamp_error` frontmatter field in pending-sync items currently reads `"no ledger rows for work_item_id <ID>"`. Once the hook records rows correctly, the next `cleargate stamp` invocation against the item should clear this field. Verify the stamper's read-side path also handles all five id shapes.

**Do NOT touch:**

- The hook chain ordering against `stamp-and-gate.sh` and `session-start.sh` (CR-009 + CR-008 own those).
- The token-ledger jsonl row schema (additive only; if a new field is needed, document it; don't remove or rename existing fields — flashcard `#reporting #hooks #ledger` fix history).
- The Reporter's ledger-reading code (out of scope this CR; M5 STORY-022-07 owns reporter contract changes).

**Out of scope:**

- Backfilling missing rows for past CRs/sprints. The fix is forward-only.
- Rewriting the SubagentStop hook architecture. Just fix the detector.
- Per-sprint ledger rotation, compaction, or analysis tooling.

## 5. Verification Protocol

**Failing test (must FAIL pre-fix, PASS post-fix):**

Given a captured SubagentStop hook payload with the agent's first response line equal to `CR=009`, when `token-ledger.sh` processes the payload AND `.cleargate/sprint-runs/.active` contains `SPRINT-14`, then a row is appended to `.cleargate/sprint-runs/SPRINT-14/token-ledger.jsonl` with `work_item_id: "CR-009"`. The same applies for `BUG=NNN`, `EPIC=NNN`, `PROPOSAL=NNN`. Five test cases, one per id shape (STORY remains as the regression baseline).

**Negative test:** when no work-item-id is detectable (agent first line has no `[A-Z]+=...` token), the row is appended to `_off-sprint/token-ledger.jsonl` with `work_item_id: "unknown"` (or whatever the existing fallback shape is — preserve it).

**Smoke after the fix:**

1. After M2 closes, run a fresh subagent invocation (any role). Confirm a row lands in `.cleargate/sprint-runs/SPRINT-14/token-ledger.jsonl` with the correct work_item_id.
2. Run `cleargate stamp` against any pending-sync CR/PROP/BUG/EPIC item that previously carried `stamp_error: no ledger rows...`. Confirm the stamp_error field clears (or updates with a real-token-count line) once at least one ledger row exists for the work-item-id.

**Pre-commit gates:**

- Unit tests for the detector covering all five id shapes + the negative case.
- A bash test (table-driven, mirroring CR-008's pattern at `cleargate-cli/test/scripts/test_pre_edit_gate.sh`) for the full hook invocation against captured payloads.
- `npm run typecheck` clean.
- `npm test` green for the affected package.
- Snapshot lock at `cleargate-cli/test/snapshots/hooks/token-ledger.bug-009.sh` (post-fix byte-baseline). Do NOT modify the cr-009 / cr-008 snapshots for `stamp-and-gate.sh` / `session-start.sh` — this hook is a separate file.
- Commit message: `fix(BUG-009): SPRINT-14 M2 — SubagentStop hook records CR / BUG / EPIC / PROPOSAL ledger rows`.
