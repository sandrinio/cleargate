---
bug_id: BUG-002
parent_ref: EPIC-013
parent_cleargate_id: "EPIC-013"
sprint_cleargate_id: "SPRINT-10"
status: Verified
severity: P2-Medium
reporter: sandro
approved: true
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-24T14:22:55Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-002
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T14:22:55Z
  sessions: []
---

# BUG-002: `sprint init` Does Not Write `.active` Sentinel or Bootstrap Per-Sprint Token Ledger

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
`cleargate sprint init <id> --stories <csv>` should:
1. Write `state.json` (already works).
2. Write `.cleargate/sprint-runs/.active` sentinel pointing at `<id>` so the token-ledger hook routes per-agent/per-story cost into `.cleargate/sprint-runs/<id>/token-ledger.jsonl`.
3. Create an empty `.cleargate/sprint-runs/<id>/token-ledger.jsonl`.

**Actual Behavior:**
Only `state.json` is written. The `.active` sentinel is absent; the token-ledger hook continues writing into `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl` for the duration of the sprint. Per-agent/per-story cost cannot be computed at sprint close — SPRINT-10 and SPRINT-11 both shipped with cost sections quoted as "ledger absent."

## 2. Reproduction Protocol

1. From a clean main checkout: `node cleargate-cli/dist/cli.cjs sprint init SPRINT-99 --stories 099-01`
2. `ls .cleargate/sprint-runs/SPRINT-99/` — only `state.json` exists. `token-ledger.jsonl` does NOT.
3. `cat .cleargate/sprint-runs/.active 2>&1` — file does not exist.
4. Dispatch any subagent (e.g., Architect). After it returns: `cat .cleargate/sprint-runs/_off-sprint/token-ledger.jsonl | tail -1` — the token-ledger row for that invocation was routed to `_off-sprint`, not `SPRINT-99`.

## 3. Evidence & Context

SPRINT-10 REPORT.md (`.cleargate/sprint-runs/SPRINT-10/REPORT.md` §5 Red Friction #1): listed as "the `.active` sentinel + ledger bootstrap at `sprint init`" follow-up.

SPRINT-11 REPORT.md: "Ledger absent. `.cleargate/sprint-runs/SPRINT-11/token-ledger.jsonl` does not exist... SPRINT-11 did not adopt the `.active` sentinel auto-write fix, so per-agent/per-story cost cannot be computed for this sprint."

Related flashcards:
- `2026-04-19 · #reporting #hooks #ledger · ...` — original SubagentStop attribution gap.
- `2026-04-19 · #reporting #hooks #ledger #subagent-attribution` — hook fires on orchestrator session, not subagents.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/init_sprint.mjs` — the script `cleargate sprint init` shells out to. Add sentinel + ledger-file bootstrap as two new steps after state.json is written.
- `cleargate-cli/src/commands/sprint.ts` `sprintInitHandler` (L59+) — if the script change is sufficient, no CLI change needed. If behavior must live in TypeScript, update here instead.
- `.claude/hooks/token-ledger.sh` — confirm it reads `.cleargate/sprint-runs/.active` (sentinel → target ledger). If the hook already does: script-side fix is sufficient.

**Do NOT modify:**
- The token-ledger routing logic itself (that's a deeper refactor — separate bug).
- SubagentStop hook attribution (separate concern per flashcard `#reporting #hooks #ledger #subagent-attribution`).

## 5. Verification Protocol (The Failing Test)

**Command (failing before fix, passing after):**
```
bash -c 'rm -rf /tmp/cg-99 && mkdir -p /tmp/cg-99/.cleargate/sprint-runs /tmp/cg-99/.cleargate/delivery && cd /tmp/cg-99 && node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.cjs sprint init SPRINT-99 --stories 099-01 >/dev/null && test -f .cleargate/sprint-runs/.active && test -f .cleargate/sprint-runs/SPRINT-99/token-ledger.jsonl && cat .cleargate/sprint-runs/.active && echo PASS'
```

Expect `SPRINT-99` in the sentinel + `PASS` at the end.

Unit-test level: add a case to whichever test file covers `sprintInitHandler` / `init_sprint.mjs` that asserts both files exist post-init.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Confirm `.active` sentinel format (single-line `SPRINT-NN` vs. JSON vs. something else — check what the token-ledger hook expects).
- [ ] Confirm whether `token-ledger.jsonl` bootstrap must be empty or must contain a header/schema row.
- [ ] `approved: true` set.
