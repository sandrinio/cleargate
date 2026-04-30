---
bug_id: BUG-010
parent_ref: BUG-009
parent_cleargate_id: "BUG-009"
sprint_cleargate_id: "SPRINT-14"
status: Verified
severity: P1-High
reporter: orchestrator
sprint: SPRINT-14
milestone: M2.5
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
  last_gate_check: 2026-04-26T17:01:33Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-26 by user audit during SPRINT-14 M2 close. SPRINT-14's token ledger
  contains 16 rows ALL attributed to work_item_id=BUG-002 + agent_type=architect. M1+M2
  shipped 6 items (CR-008/009/010, BUG-008/009, STORY-014-01) across architect + 6×
  developer + 6× qa subagent invocations — none of those rows are present.

  Root cause: token-ledger.sh detector (post-BUG-009) uses jq scan() over the joined
  first-user-message content and picks `head -1`. The orchestrator's dispatch prompt
  to subagents is preceded in the transcript by the SessionStart hook's "blocked items"
  reminder text, which lists BUG-002 first (alphabetic order). scan() finds BUG-002
  before the orchestrator's STORY=NNN-NN / CR=NNN first-line marker, so every agent's
  ledger row gets keyed BUG-002.

  BUG-009 fixed PROP↔PROPOSAL normalization correctly — that fix is preserved. BUG-010
  is a separate, prior-art defect: the scan window is too wide.
stamp_error: no ledger rows for work_item_id BUG-010
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T17:01:32Z
  sessions: []
---

# BUG-010: Token-Ledger Detector Mis-Attributes to First Token in Transcript Content (Not Agent Dispatch Marker)

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** Each ledger row records the work-item the spawning Agent invocation was dispatched for. The orchestrator convention (per `.claude/agents/developer.md`) requires the first line of the dispatch prompt to be `STORY=NNN-NN` (or `CR=NNN`, `BUG=NNN`, `EPIC=NNN`, `PROPOSAL=NNN` / `PROP=NNN`). The detector should use that first-line marker as the canonical work_item_id source.

**Actual Behavior:** The detector scans the entire first-user-message content for any token matching `(STORY|PROPOSAL|PROP|EPIC|CR|BUG)[-=]NNN`. When the SessionStart hook (CR-008's stdout routing now surfaces it to Claude) emits a "blocked items" reminder listing BUG-002, BUG-003, etc., that text appears in transcript content BEFORE the orchestrator's dispatch marker. `head -1` of the scan picks the first match — always BUG-002.

Net effect on SPRINT-14: 16 ledger rows, all `work_item_id=BUG-002`, all `agent_type=architect`. M1+M2 commit attribution is unrecoverable. Reporter §3 Execution Metrics for SPRINT-14 will be empty unless this is fixed before M3.

## 2. Reproduction Protocol

1. From repo root: `cat .cleargate/sprint-runs/SPRINT-14/token-ledger.jsonl | jq '.work_item_id' | sort -u`
2. Observed: `"BUG-002"` (and only that).
3. Expected: `"CR-009"`, `"CR-008"`, `"CR-010"`, `"BUG-008"`, `"BUG-009"`, `"STORY-014-01"`, `"BUG-010"` — one or more per agent invocation.
4. Inspect any subagent transcript at the path the hook receives:
   `head -200 /tmp/<transcript>.jsonl | jq 'select(.type == "user") | .message.content[].text' | head -50`
5. Note the SessionStart "blocked items" reminder (containing `BUG-002:` etc.) appears BEFORE the orchestrator's `CR=009` / `STORY=NNN-NN` first-line marker.
6. Run the current detector logic manually:
   `jq -rs '[.[] | select(.type == "user")] | .[0].message.content | if type == "array" then map(.text? // "") | join(" ") else (. // "") end | scan("(STORY|PROPOSAL|PROP|EPIC|CR|BUG)[-=]?([0-9]+(-[0-9]+)?)")' <transcript>`
7. Confirms: first match is `["BUG", "002", null]` — the SessionStart-injected mention, not the dispatch marker.

## 3. Evidence & Context

```
[from .cleargate/sprint-runs/SPRINT-14/token-ledger.jsonl, 2026-04-26]
{"work_item_id":"BUG-002","agent_type":"architect", ...}  × 16 rows, none varying
```

```
[user audit observation]
"Ledger is mis-attributing. SPRINT-14 ledger has 16 rows — all agent_type=architect,
all work_item_id=BUG-002. No developer/QA rows for M1 or M2 commits. BUG-009's fix
didn't land the right detector — likely latching onto the SessionStart 'blocked items'
reminder (BUG-002 is first in that list)."
```

The 16 rows being all `architect` is itself a second mis-attribution clue: agent_type detection presumably runs off the same content scan. Both agent_type and work_item_id have the same root cause (scanning too wide a window).

## 4. Execution Sandbox

**Cross-OS / Cross-repo portability is the load-bearing constraint.** This hook ships with `cleargate init` and runs on every user's machine. Any solution that works on macOS but breaks on Linux/WSL is not acceptable.

**Modify:**

- `cleargate-planning/.claude/hooks/token-ledger.sh` — the work_item_id detector logic (the jq pipeline at lines ~118–124 and the fallback grep at ~127–131). BUG-009's PROP↔PROPOSAL normalization (lines 121, 130, ~133) MUST be preserved.

**Do NOT touch:**

- The five existing CR-008/CR-009 snapshots at `cleargate-cli/test/snapshots/hooks/`.
- BUG-009's PROP↔PROPOSAL normalization sed pipeline.
- The token-ledger row schema (additive only; preserve all existing fields).
- `stamp-and-gate.sh`, `session-start.sh`, `pre-edit-gate.sh` — all M1 surfaces.
- The orchestrator side (no `CG_WORK_ITEM_ID` env-var contract this round; that's a follow-up if needed). The fix is hook-internal, transcript-only.

**Out of scope:**

- Backfilling SPRINT-14 M1+M2 ledger rows. Those are unrecoverable; the recovery note in `state.json` documents the gap.
- Agent_type mis-attribution. Likely the same root cause but file separately if proven distinct.
- Any change to the orchestrator's dispatch prompt format.

## 4b. Cross-OS Portability Requirements (Mandatory)

The shell script must run unchanged on:
- **macOS** (BSD coreutils): bash 3.2+ default shell, BSD `sed`, BSD `grep`, BSD `awk`, jq from Homebrew or system.
- **Linux** (GNU coreutils): bash 4+/5+, GNU `sed`, GNU `grep`, GNU `awk`, jq from apt/dnf/etc.
- **WSL2 Ubuntu**: same as Linux.
- **Alpine** (musl): bash optional (sometimes ash-only), busybox utilities. Defensive: keep using `bash` shebang, but avoid bash-4-only features (associative arrays, `${var,,}` lowercasing, `mapfile`).

Specific portability rules for this fix:
- **Do NOT use** `sed -i ''` (BSD-only). The hook reads transcript and pipes; no in-place edits.
- **Do NOT use** `\<` / `\>` word boundaries (GNU-only). Use `[^a-zA-Z0-9_]` or jq regex `\b`.
- **Do NOT use** GNU-extension regex like `\d` in `grep -E` (POSIX BREs/EREs only). `grep -E` portable form: `[0-9]`, `[A-Z]`. jq's regex engine is oniguruma — `\d` works there.
- **Do NOT use** `readarray` / `mapfile`. Use a `while read` loop or jq's array operations.
- **Do NOT use** `[[ -v var ]]`. Use `[[ -n "${var:-}" ]]`.
- **Use jq's `(?m)` multiline flag** for line-anchored matches (oniguruma supports it). Verified portable across jq 1.5+.
- **`printf '%s\n'`** instead of `echo -e` (BSD echo doesn't support `-e`).
- **`date -u +%FT%TZ`** is portable. Avoid `date -d` (GNU) and `date -j` (BSD).
- **Quote all variable expansions** (`"${var}"`) — defensive against IFS surprises.

## 5. Verification Protocol

**Failing test (must FAIL pre-fix, PASS post-fix):**

Given a captured transcript fixture where:
- The first user message's content includes a SessionStart-style "blocked items: BUG-002, BUG-003, ..." reminder block AT THE TOP.
- The orchestrator's dispatch marker appears LATER in the same first user message: line `CR=009` (or `STORY=014-01` etc.).

When `token-ledger.sh` processes the transcript: the resulting work_item_id MUST be `CR-009` (the dispatch marker), NOT `BUG-002` (the reminder text).

**Test cases (six minimum, all in the bash table-driven harness):**

1. Pre-fix repro: transcript with SessionStart `BUG-002` reminder + `CR=009` dispatch line → post-fix output `CR-009`. (Pre-fix output `BUG-002` is the documented broken baseline.)
2. Same but `STORY=014-01` dispatch.
3. Same but `BUG=008` dispatch.
4. Same but `EPIC=022` dispatch.
5. Same but `PROPOSAL=013` dispatch (with PROPOSAL→PROPOSAL no-op).
6. Same but `PROP=013` dispatch (BUG-009 normalize → `PROPOSAL-013`).

**Negative tests:**

7. Transcript with no dispatch marker (only the SessionStart reminder): falls back to `_off-sprint/` with documented behavior. Confirm BUG-009's behavior is preserved here (whatever it was — match exactly).
8. Transcript with multiple dispatch markers (orchestrator hands off mid-task): pick the FIRST line-anchored marker in the first user message. Document the deterministic tie-break.

**Cross-OS smoke (manual, document in commit message):**

- Run the bash test harness on macOS (this dev box) — all 8 cases pass.
- If a Linux box is reachable (Docker / VM / GitHub Actions), run the same harness — all 8 cases pass identically.
- If neither is reachable, document the cross-OS verification as a follow-up SPRINT-15 task and SHIP with macOS-only verification — but the fix MUST already be written in portable form per §4b.

**Snapshot lock:**

- New `cleargate-cli/test/snapshots/hooks/token-ledger.bug-010.sh` capturing post-fix byte-baseline. The bug-009 snapshot stays as the historical baseline.
- The vitest wrapper (`hooks-snapshots.test.ts`) extended to also assert the bug-010 byte-baseline.

**Pre-commit gates:**

- `npm run typecheck` clean for cleargate-cli.
- `npm test` green for cleargate-cli — including the protocol byte-equality test, the bash harness wrapper, and the new bug-010 snapshot.
- Bash test passes on the dev box: `bash cleargate-cli/test/scripts/test_token_ledger.sh`.
- Commit message: `fix(BUG-010): SPRINT-14 M2.5 — token-ledger detector scopes to dispatch marker, not transcript content`.
- One commit. NEVER `--no-verify`.
