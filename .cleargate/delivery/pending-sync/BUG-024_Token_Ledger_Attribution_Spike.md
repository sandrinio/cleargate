---
bug_id: BUG-024
parent_ref: SPRINT-18 REPORT.md §6 Tooling (token-ledger Red carry-forward); SPRINT-17 REPORT.md §5 Tooling (same row)
parent_cleargate_id: "SPRINT-18 REPORT.md §6 Tooling (token-ledger Red carry-forward); SPRINT-17 REPORT.md §5 Tooling (same row)"
sprint_cleargate_id: SPRINT-19
carry_over: false
status: Approved
ambiguity: 🟢 Low
severity: P2-Medium
reporter: sandrinio
context_source: "SPRINT-18 mid-close spike conversation 2026-05-01. Token-ledger SubagentStop attribution has been Red since SPRINT-15 (CR-018). Carried forward through SPRINT-16, SPRINT-17, SPRINT-18. Per-agent / per-story cost is unrecoverable: 100% of SPRINT-18 ledger rows (23 rows) attribute to BUG-004 / architect (the orchestrator's session). User 2026-05-01: 'we also need to think of a way how to make token ledger work. do a small spike maybe?' — investigation-shaped bug, not a fix-shaped bug. The fix lands as CR-026 in SPRINT-20."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T22:30:00Z
  reason: Direct approval pattern. Investigation-only scope; no production code changes. Diagnosis is the deliverable; fix is reserved for CR-026 in SPRINT-20.
approved: true
owner: sandrinio
target_date: SPRINT-19
created_at: 2026-05-01T22:30:00Z
updated_at: 2026-05-01T22:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T19:44:05Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-024
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T19:44:00Z
  sessions: []
---

# BUG-024: Token-Ledger Attribution Spike (SubagentStop Hook Misroutes 100% of Rows)

**Severity:** P2-Medium — sprint accounting unusable but no functional regression. Carried forward from SPRINT-15 / -16 / -17 / -18.
**Lane:** `standard` — investigation-only, no production code change. The fix scope (CR-026) is sized at ~100 LOC across 3 surfaces.

### 0.5 Open Questions (resolved)

- **Question:** Land the fix in BUG-024 itself (escape valve for "easy fix") or always file CR-026?
  **Recommended:** **File CR-026 in SPRINT-20.** ~100 LOC across 3 surfaces (hook script + new PreToolUse:Task hook + settings.json wiring + CLAUDE.md update) is medium scope. Keeping BUG-024 investigation-only avoids scope creep mid-spike.
  **Human decision:** _accept recommended_

- **Question:** Does Claude Code SubagentStop payload include `parent_session_id` (orchestrator's session ID)? If yes, the fix could use that as the dispatch-file key instead of "newest file" lookup.
  **Recommended:** **Investigate as part of CR-026 design**, not BUG-024. If `parent_session_id` exists, use it (cleaner). Otherwise, fall back to newest-file heuristic. Either way is sound.
  **Human decision:** _accept recommended_

## 1. The Anomaly

**Expected:** Each SubagentStop hook fire writes one ledger row attributed to the correct `(work_item_id, agent_type)` pair via the dispatch marker (`.dispatch-<session-id>.json`) written by the orchestrator before each `Task()` spawn.

**Actual:** 100% of SPRINT-18's 23 ledger rows attribute to `BUG-004 / architect` — the orchestrator's session, surfaced via the SessionStart banner. Per-agent / per-story cost is unrecoverable. Hook log shows zero `dispatch-marker:` success lines; every fire goes to `work_item_id fallback grep: BUG-004`.

## 2. Reproduction Protocol

Already reproduced organically across 4 sprints (SPRINT-15 through SPRINT-18). To re-verify deterministically, run each step in order:

- **Step 1 — Confirm active sprint sentinel.** `cat .cleargate/sprint-runs/.active` returns a sprint ID (e.g., `SPRINT-18`). If missing, the hook has nothing to route to and the bug doesn't reproduce.
- **Step 2 — Inspect ledger attribution.** Run `cat .cleargate/sprint-runs/SPRINT-18/token-ledger.jsonl | jq -r '.work_item_id + " / " + .agent_type' | sort | uniq -c`. Expected output (today): all rows attribute to a single `(work_item, agent)` pair, typically `BUG-004 / architect`.
- **Step 3 — Confirm hook-log dispatch-marker miss.** Run `grep "dispatch-marker:" .cleargate/hook-log/token-ledger.log | wc -l` — returns `0`. Then run `grep "fallback grep:" .cleargate/hook-log/token-ledger.log | wc -l` — returns a number ≫ 0. The fallback path is firing 100% of the time.
- **Step 4 — Confirm orphaned dispatch markers.** Run `ls .cleargate/sprint-runs/SPRINT-18/.dispatch-*.json` — at least one file is present at end of sprint, never consumed by the hook (no `.processed-*` siblings exist alongside).
- **Step 5 — Confirm session-ID mismatch root cause.** `jq -r .session_id` on a `.dispatch-*.json` returns the orchestrator's stable session ID. Cross-reference any `[time] sprint=…` row in the hook log — its embedded session_id (subagent's) differs. Mismatch is the proximate cause of Defect 1 in §3.1.

## 3. Evidence & Context

### 3.1 Three concrete defects (root causes ranked)

**Defect 1 (HIGH) — Session-ID mismatch between dispatch-marker writer and hook reader.**

- `bash .cleargate/scripts/write_dispatch.sh <work-item> <agent>` runs in the **orchestrator's** Claude Code session. It reads `CLAUDE_SESSION_ID` and writes file `.dispatch-${CLAUDE_SESSION_ID}.json`. Today's value: `058877cf-c8e4-43a6-a943-5ad270f0ab47` (the orchestrator's session, stable across SPRINT-16/17/18).
- `.claude/hooks/token-ledger.sh` (SubagentStop hook) fires when a **subagent** completes. It reads `session_id` from the hook's stdin payload — that's the **subagent's** session_id, not the orchestrator's. Different value every fire.
- File-name lookup `${SPRINT_DIR}/.dispatch-${SESSION_ID}.json` therefore fails 100% of the time. The dispatch file written by the orchestrator stays on disk indefinitely (never renamed to `.processed-*`).

**Defect 2 (HIGH) — Transcript-grep fallback poisoned by SessionStart banner.**

- When the dispatch-marker path fails (always), the hook falls back to grepping the subagent's transcript for the first `(STORY|EPIC|CR|BUG|PROPOSAL|HOTFIX)-NNN(-NN)?` match.
- Every Claude Code session starts by emitting the SessionStart hook output, which includes the line `1 items blocked: BUG-004: repro-steps-deterministic` (when BUG-004 is the only blocked item — true since SPRINT-15).
- That line is at the top of every subagent's transcript. The fallback regex matches `BUG-004` first → all rows attribute to it.
- Even if Defect 1 is fixed, this fallback path stays poisoned for any session that hits the SessionStart banner.

**Defect 3 (MEDIUM) — Manual `write_dispatch.sh` discipline is unreliable.**

- `write_dispatch.log` shows the orchestrator called `write_dispatch.sh` ~5 times in SPRINT-18 against ~19 actual agent spawns (4 architect + 7 developer + 7 QA + 1 reporter). The orchestrator (the conversational agent) forgets to call it.
- Even when called correctly, Defect 1 makes the call useless. The discipline gap is compounded by the lookup gap.

**Bonus — dead `.pending-task-*.json` code path.**

- The hook's "second priority" attribution path reads `.pending-task-*.json` files. Nothing in the codebase writes those — confirmed via `grep -rn "\.pending-task-" .` returns only the hook itself (the reader). ~50 LOC of dead code.

### 3.2 Hook log evidence (SPRINT-18, abbreviated)

```
[2026-05-01T12:53:09Z] routing to sprint=SPRINT-18 (sentinel)
[2026-05-01T12:53:09Z] work_item_id fallback grep: BUG-004
[2026-05-01T12:53:09Z] wrote row: sprint=SPRINT-18 agent=architect work_item=BUG-004 ...
... (×23, identical pattern) ...
```

Zero rows show `[time] dispatch-marker: session=<id> work_item=<id> agent=<id>` (the success log line).

### 3.3 Dispatch-file evidence

```
$ cat .cleargate/sprint-runs/SPRINT-18/.dispatch-058877cf-c8e4-43a6-a943-5ad270f0ab47.json
{"work_item_id":"SPRINT-18","agent_type":"reporter","spawned_at":"2026-05-01T16:22:50Z",
 "session_id":"058877cf-c8e4-43a6-a943-5ad270f0ab47","writer":"write_dispatch.sh@cleargate-0.9.0"}
```

The dispatch file was written correctly by `write_dispatch.sh` at 16:22:50Z (Reporter spawn). It still sits on disk as of close. The hook never moved it to `.processed-*` because the hook's session_id never matched.

### 3.4 Recommended fix scope (for CR-026, not BUG-024)

**Surface 1 — `.claude/hooks/token-ledger.sh`:**
- Replace `DISPATCH_FILE="${SPRINT_DIR}/.dispatch-${SESSION_ID}.json"` with newest-file lookup:
  ```bash
  DISPATCH_FILE="$(ls -t "${SPRINT_DIR}"/.dispatch-*.json 2>/dev/null | head -1)"
  ```
  OR use `parent_session_id` from hook stdin if Claude Code provides it.
- Strip SessionStart banner output from transcript-grep fallback. Skip lines matching `^\[blocked-items\]` or whatever the banner format becomes.
- Delete dead `.pending-task-*.json` reader code path (~50 LOC).

**Surface 2 — New `.claude/hooks/pre-tool-use-task.sh` (PreToolUse:Task hook):**
- Auto-write dispatch marker by parsing the orchestrator's `Task()` prompt for the first `STORY=NNN-NN`, `BUG-NNN`, etc. marker.
- Replaces the manual `bash write_dispatch.sh` convention. Eliminates Defect 3.
- Output: same `.dispatch-<id>.json` shape (or simpler — agent_type + work_item_id + spawned_at).

**Surface 3 — `.claude/settings.json` + CLAUDE.md:**
- Wire PreToolUse:Task in `settings.json`.
- Update CLAUDE.md "Orchestrator Dispatch Convention" section to retire manual `write_dispatch.sh` calls (kept as fallback only).

**Estimated total:** ~100 LOC. Lane: standard. Complexity L2. Single CR. Ships SPRINT-20.

## 4. Execution Sandbox

**Investigation-only — NO production code changes in BUG-024.** Files inspected (read-only):

- `.claude/hooks/token-ledger.sh` (live + canonical mirror at `cleargate-planning/.claude/hooks/`)
- `.cleargate/scripts/write_dispatch.sh` (live + canonical mirror at `cleargate-planning/.cleargate/scripts/`)
- `.cleargate/hook-log/token-ledger.log` (runtime — gitignored)
- `.cleargate/hook-log/write_dispatch.log` (runtime — gitignored)
- `.cleargate/sprint-runs/SPRINT-18/token-ledger.jsonl`
- `.cleargate/sprint-runs/SPRINT-18/.dispatch-058877cf-c8e4-43a6-a943-5ad270f0ab47.json`

**What BUG-024 ships:** this document + a follow-up note in `improvement-suggestions.md` referencing CR-026.

## 5. Verification Protocol

**Pre-fix (BUG-024 closes when these are true):**
- [ ] §3 root-cause analysis is complete (3 defects + dead code) — DONE.
- [ ] §3.4 fix scope estimate is concrete enough that CR-026 can be drafted from it.
- [ ] CR-026 filed in pending-sync targeting SPRINT-20.
- [ ] `improvement-suggestions.md` Token-Ledger row updated with the diagnosis pointer.

**Post-fix (deferred to CR-026 verification):**
- [ ] `.cleargate/sprint-runs/SPRINT-20/token-ledger.jsonl` shows >1 distinct `(work_item_id, agent_type)` pair after a sprint with ≥3 different stories.
- [ ] `.cleargate/hook-log/token-ledger.log` shows ≥1 `dispatch-marker:` success line per Task spawn.
- [ ] No row attributes to `BUG-004 / architect` (the historical mis-attribution sentinel).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — pending Gate 1 (push)**

Requirements to pass to Green:
- [x] §1 Anomaly + §2 Repro deterministic.
- [x] §3 Evidence cites concrete log lines + dispatch-file evidence.
- [x] §3.4 Fix scope sized for CR-026 (estimable in LOC + surfaces).
- [x] §4 Sandbox = investigation-only; no production code in BUG-024.
- [x] §5 Verification splits BUG-024 close criteria from CR-026 fix verification.
